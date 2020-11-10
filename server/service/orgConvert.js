const fs = require('fs');
const spawn = require('child_process').spawn;
const { ogrDrivers } = require('../lookup/ogrDrivers.js');

exports.convertUsingOgr = (workingFolder, likelyFile, key, layersValue, typeValue) => {
  console.log({ likelyFile, layersValue, typeValue });

  const ext = lookupExt(typeValue);
  const convert = lookupDesc(typeValue);
  const outputFolder = 'output/';

  return new Promise((resolve, reject) => {
    const application = 'ogr2ogr';
    const args = [
      '-f',
      typeValue,
      `${workingFolder}${outputFolder}${key}_${convert}.${ext}`,
      likelyFile,
    ];

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
      //   console.log('command', { command });
      //   console.log('ogrinfo', { textOutput });
      console.log({ code });
      return resolve();
    });
  });
};

function lookupExt(typeValue) {
  return ogrDrivers[typeValue].ext;
}

function lookupDesc(typeValue) {
  return ogrDrivers[typeValue].app;
}
