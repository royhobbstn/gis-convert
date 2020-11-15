const fs = require('fs');
const spawn = require('child_process').spawn;

exports.findLikelyFile = workingFolder => {
  const arrayOfFiles = fs.readdirSync(workingFolder, { withFileTypes: true }); // TODO avoid blocking in server environment

  const filteredFiles = [];

  // first check for .gdb directory or .shp
  for (let file of arrayOfFiles) {
    // early return because we found an eligible file
    if (file.name.endsWith('.gdb') || file.name.endsWith('.shp')) {
      return workingFolder + file.name;
    }

    // filter out all directories, files with .zip
    if (file.isFile() && !file.name.endsWith('.zip')) {
      filteredFiles.push(file.name);
    }
  }

  // if only one actual file, choose that.
  if (filteredFiles.length === 1) {
    return workingFolder + filteredFiles[0];
  }

  // otherwise search an array of possible types (gpkg, geojson, etc)
  // because somebody might have thrown a README in with a geojson file in a zip archive
  const extensions = ['.gpkg', '.geojson'];
  for (let file of filteredFiles) {
    for (let extension of extensions) {
      if (file.endsWith(extension)) {
        return workingFolder + file;
      }
    }
  }

  // otherwise throw error and learn from it.
  throw new Error('Could not find eligible file.');
};

exports.getOgrInfo = (ctx, filePath) => {
  ctx.log.info(`Running ogrinfo`);

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
      ctx.log.info(data.toString());
    });

    proc.on('error', err => {
      ctx.log.error('Error', { err: err.message, stack: err.stack });
      return reject(err);
    });

    proc.on('close', code => {
      ctx.log.info(`completed gathering ogrinfo.`);
      ctx.log.info('code', { code });
      if (code !== 0) {
        return reject('Error in ogrinfo.');
      }
      ctx.log.info(textOutput);
      return resolve(textOutput);
    });
  });
};

exports.parseOgrOutput = (ctx, textOutput) => {
  ctx.log.info(`Parsing output from ogrinfo`);

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

  ctx.log.info('layers: ', { layers });

  return layers;
};
