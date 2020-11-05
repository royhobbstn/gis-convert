const config = require('config');
const { tempFolder } = require('./constants.js');
const { v4: uuid } = require('uuid');
const mkdirp = require('mkdirp');
const { extractZip, collapseUnzippedDir } = require('./filesystem.js');
const { downloadFileFromS3 } = require('./s3.js');

exports.processMessage = async incomingPayload => {
  console.log('processing');
  console.log(incomingPayload);

  const message = incomingPayload.Messages[0];
  const attributes = message.MessageAttributes;
  const messageType = attributes.messageType.StringValue;
  const body = JSON.parse(message.Body);
  const folderId = uuid().slice(0, 6) + '/';

  const workingFolder = tempFolder + folderId;
  mkdirp.sync(workingFolder);

  console.log({ attributes, body, workingFolder });

  if (messageType === 'info') {
    await processGeoFileInfo(workingFolder, body);
  } else if (messageType === 'convert') {
    await processGeoFileConversion(body);
  } else {
    throw new Error(`Unexpected MessageType: ${messageType}`);
  }
};

async function processGeoFileInfo(workingFolder, body) {
  const key = body.data.key;
  // load file from S3
  await downloadFileFromS3(config.get('Buckets.mainBucket'), key, workingFolder);

  // extract file down from zip if needed.
  const lastFourChars = key.slice(-4);
  console.log({ lastFourChars });
  if (lastFourChars === '.zip') {
    extractZip(workingFolder, key);
    collapseUnzippedDir(workingFolder);
  }
  // getOgrInfo
  // parseOgrInfo into JSON.
  // Save Info to Dynamo and update status
}

async function processGeoFileConversion() {
  //
}

function getOgrInfo(ctx, filePath) {
  ctx.process.push({ name: 'getOgrInfo', timestamp: getTimestamp() });
  let textOutput = '';

  return new Promise((resolve, reject) => {
    const application = 'ogrinfo';
    const args = ['-ro', '-al', '-so', filePath];

    const command = `${application} ${args.join(' ')}`;
    ctx.log.info(`running: ${command}`);

    const proc = spawn(application, args);

    proc.stdout.on('data', data => {
      textOutput += data.toString();
    });

    proc.stderr.on('data', data => {
      ctx.log.warn(data.toString());
    });

    proc.on('error', err => {
      ctx.log.error('Error', { err: err.message, stack: err.stack });
      return reject(err);
    });

    proc.on('close', code => {
      ctx.log.info(`completed gathering ogrinfo.`);
      unwindStack(ctx, 'getOgrInfo');
      ctx.log.info('command', { command });
      ctx.log.info('ogrinfo', { textOutput });
      return resolve(textOutput);
    });
  });
}

function parseOgrOutput(ctx, textOutput) {
  ctx.process.push({ name: 'parseOgrOutput', timestamp: getTimestamp() });

  const layers = [];
  let cursor = 0;

  const LAYER_NAME = 'Layer name: ';
  const GEOMETRY = 'Geometry: ';
  const FEATURE_COUNT = 'Feature Count: ';

  do {
    const idxLN = textOutput.indexOf(LAYER_NAME, cursor);
    if (idxLN === -1) {
      break;
    }
    const brLN = textOutput.indexOf('\n', idxLN);
    const layerName = textOutput.slice(idxLN + LAYER_NAME.length, brLN);
    const idxG = textOutput.indexOf(GEOMETRY, brLN);
    const brG = textOutput.indexOf('\n', idxG);
    const geometry = textOutput.slice(idxG + GEOMETRY.length, brG);
    const idxFC = textOutput.indexOf(FEATURE_COUNT, brG);
    const brFC = textOutput.indexOf('\n', idxFC);
    const featureCount = textOutput.slice(idxFC + FEATURE_COUNT.length, brFC);

    layers.push({ type: geometry, name: layerName, count: Number(featureCount) });
    cursor = brFC;
  } while (true);

  unwindStack(ctx, 'parseOgrOutput');
  return layers;
}
