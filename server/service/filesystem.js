const fsExtra = require('fs-extra');
const { execSync } = require('child_process');
const fs = require('fs');
const del = require('del');
const mkdirp = require('mkdirp');

exports.extractZip = (ctx, workingFolder, key) => {
  try {
    const output = execSync(`unzip ${workingFolder}${key} -d ${workingFolder}`);
    ctx.log.info('Zip Log: ' + output.toString());
    ctx.log.info(`Success unzipping ${workingFolder}${key}`);
  } catch (e) {
    ctx.log.error(`unzipping from ${workingFolder}${key} failed`);
    throw e;
  }
};

exports.zipDirectory = (ctx, navigateTo, outputRoot, zipPath) => {
  try {
    const output = execSync(`cd ${navigateTo} && zip -r ../.${zipPath} ${outputRoot}`);
    ctx.log.info('Zip Log: ' + output.toString());
    ctx.log.info(`Success zipping ${outputRoot} to ../.${zipPath}`);
  } catch (e) {
    ctx.log.error(`Zipping ${outputRoot} to ../.${zipPath} failed`);
    throw e;
  }
};

exports.collapseUnzippedDir = (ctx, workingFolder) => {
  const arrayOfFiles = fs.readdirSync(workingFolder);
  let movedFlag = false;

  for (let file of arrayOfFiles) {
    const isDir = fs.lstatSync(`${workingFolder}${file}`).isDirectory();
    const isGDB = file.slice(-4).toLowerCase() === '.gdb';

    if (isDir && !isGDB) {
      // move contents of this directory to workingFolder
      const subDirectory = `${workingFolder}${file}`;
      ctx.log.info(`Moving contents of folder: ${subDirectory} into base folder: ${workingFolder}`);
      const arrayOfSubDirectoryFiles = fs.readdirSync(subDirectory);

      // add move-prefix to avoid potential filename collision with identical files (or identically named files) in the lower directory
      const prefix = uuid().slice(5);
      for (let subFile of arrayOfSubDirectoryFiles) {
        fsExtra.moveSync(`${subDirectory}/${subFile}`, `${workingFolder}/${prefix}-${subFile}`);
        movedFlag = true;
      }
    }
  }

  if (movedFlag) {
    return collapseUnzippedDir(ctx, workingFolder);
  }
  ctx.log.info('done collapsing');
};

exports.cleanDirectory = async function (dir) {
  // not using ctx here on purpose
  try {
    await del(dir, { force: true });
    console.log('Deleted directory:', { dir });
  } catch (err) {
    console.error(`Error while deleting ${dir}.`, { error: err.message, stack: err.stack });
  }
};

exports.createDirectories = async function (dirs) {
  for (let dir of dirs) {
    mkdirp.sync(dir);
    console.log(`Created directory: ${dir}`);
  }
  console.log('Done creating staging directories.');
};
