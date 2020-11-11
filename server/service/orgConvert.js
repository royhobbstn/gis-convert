const fs = require('fs');
const mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;
const { ogrDrivers } = require('../lookup/ogrDrivers.js');

exports.convertUsingOgr = (workingFolder, likelyFile, key, layersValue, typeValue) => {
  console.log({ likelyFile, layersValue, typeValue });

  const ext = lookupExt(typeValue);
  const convert = lookupDesc(typeValue);
  const plainKey = key.replace('.zip', '');
  const outputFolder = `${plainKey}_${convert}/`;
  const zipFolder = 'zipped/';
  const outputRoot = `${workingFolder}${outputFolder}`;
  const zippedRoot = `${workingFolder}${zipFolder}`;
  mkdirp.sync(outputRoot);
  mkdirp.sync(zippedRoot);
  const outputFileName = `${plainKey}${ext}`;
  const outputPath = `${outputRoot}${outputFileName}`;
  const zipFileName = `${plainKey}_${convert}.zip`;
  const zipPath = `${zippedRoot}${zipFileName}`;

  return new Promise((resolve, reject) => {
    const application = 'ogr2ogr';
    const args = ['-f', typeValue, outputPath, likelyFile];

    const command = `${application} ${args.join(' ')}`;
    console.log(`running: ${command}`);

    const proc = spawn(application, args);

    proc.stdout.on('data', data => {
      console.log(data.toString());
    });

    proc.stderr.on('data', data => {
      console.log(data.toString());
    });

    proc.on('error', err => {
      console.error('Error', { err: err.message, stack: err.stack });
      return reject(err);
    });

    proc.on('close', code => {
      console.log(`completed gathering ogrinfo.`);
      console.log('code', { code });
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
