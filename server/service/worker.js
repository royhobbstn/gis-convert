const config = require('config');
const { tempFolder, status } = require('./constants.js');
const { v4: uuid } = require('uuid');
const mkdirp = require('mkdirp');
const { extractZip, collapseUnzippedDir } = require('./filesystem.js');
const { downloadFileFromS3 } = require('./s3.js');
const { findLikelyFile, getOgrInfo, parseOgrOutput } = require('./ogrInfo.js');
const { fetchDynamoRecord, putDynamoRecord } = require('./dynamo.js');
const TABLE = config.get('Dynamo.table');

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
  const sessionId = body.session_id;
  const uniqueId = body.unique_id;
  const key = body.key;

  // fetch DYNAMO record
  const response = await fetchDynamoRecord(TABLE, sessionId, uniqueId);
  console.log('response');
  console.log(response);

  const record = response.Items[0];

  // update status in Dynamo from Uploaded to SCANNING
  record.status = status.SCANNING;
  await putDynamoRecord(TABLE, record);

  // load file from S3
  await downloadFileFromS3(config.get('Buckets.mainBucket'), key, workingFolder);

  // extract file down from zip if needed.
  const lastFourChars = key.slice(-4);
  let likelyFile = workingFolder + key;
  if (lastFourChars === '.zip') {
    extractZip(workingFolder, key);
    collapseUnzippedDir(workingFolder);
    likelyFile = findLikelyFile(workingFolder);
  }

  // send to ogr-info command line
  const ogrOutput = await getOgrInfo(likelyFile);

  // parseOgrInfo into JSON.
  const layers = parseOgrOutput(ogrOutput);
  console.log(layers);

  // Save Info to Dynamo and update status (use same JSON as earlier to avoid re-calling)
  record.info = layers;
  record.status = status.READY;
  await putDynamoRecord(tABLE, record);
}

async function processGeoFileConversion() {
  //
}
