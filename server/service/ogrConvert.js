const { v4: uuid } = require('uuid');
const mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;
const { ogrDrivers } = require('../lookup/ogrDrivers.js');

exports.convertUsingOgr = (ctx, workingFolder, likelyFile, key, typeValue) => {
  const ext = lookupExt(typeValue);
  const convert = lookupDesc(typeValue);
  const plainKey = uuid().slice(0, 6) + key.slice(6).replace('.zip', '');
  const outputFolder = `${plainKey}_${convert}/`;
  const zipFolder = 'zipped/';
  const outputRoot = `${workingFolder}${outputFolder}`;
  const zippedRoot = `${workingFolder}${zipFolder}`;
  ctx.log.info('making folder (outputRoot): ', { outputRoot });
  mkdirp.sync(outputRoot);
  ctx.log.info('making folder (zippedRoot): ', { zippedRoot });
  mkdirp.sync(zippedRoot);
  const outputFileName = `${plainKey}${ext}`;
  const outputPath = `${outputRoot}${outputFileName}`;
  const zipFileName = `${plainKey}_${convert}.zip`;
  const zipPath = `${zippedRoot}${zipFileName}`;
  ctx.log.info('outputPath', { outputPath });
  ctx.log.info('zipPath', { zipPath });

  return new Promise((resolve, reject) => {
    const application = 'ogr2ogr';
    const args = ['-f', typeValue, outputPath, likelyFile];

    const command = `${application} ${args.join(' ')}`;
    ctx.log.info(`running: ${command}`);

    const proc = spawn(application, args);

    proc.stdout.on('data', data => {
      ctx.log.info(data.toString());
    });

    proc.stderr.on('data', data => {
      ctx.log.info(data.toString());
    });

    proc.on('error', err => {
      ctx.log.error('Error', { err: err.message, stack: err.stack });
      return reject(err);
    });

    proc.on('close', code => {
      ctx.log.info(`completed conversion using ogr2ogr.`);
      ctx.log.info('code', { code });
      if (code !== 0) {
        return reject('Error in ogr2ogr.');
      }
      return resolve([outputFolder.slice(0, -1), zipPath, zipFileName]);
    });
  });
};

function lookupExt(typeValue) {
  return ogrDrivers[typeValue].ext;
}

function lookupDesc(typeValue) {
  return ogrDrivers[typeValue].app;
}
