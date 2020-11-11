const fsExtra = require('fs-extra');
const { execSync } = require('child_process');
const fs = require('fs');

exports.extractZip = (workingFolder, key) => {
  try {
    const output = execSync(`unzip ${workingFolder}${key} -d ${workingFolder}`);
    console.log('Zip Log: ' + output.toString());
    console.log(`Success unzipping ${workingFolder}${key}`);
  } catch (e) {
    console.log(`unzipping from ${workingFolder}${key} failed`);
    throw e;
  }
};

exports.zipDirectory = (navigateTo, outputRoot, zipPath) => {
  try {
    const output = execSync(`cd ${navigateTo} && zip -r ${zipPath} ${outputRoot}`);
    console.log('Zip Log: ' + output.toString());
    console.log(`Success zipping ${outputRoot} to ${zipPath}`);
  } catch (e) {
    console.log(`Zipping folder ${outputRoot} to ${zipPath} failed`);
    throw e;
  }
};

exports.collapseUnzippedDir = workingFolder => {
  const arrayOfFiles = fs.readdirSync(workingFolder);
  let movedFlag = false;

  for (let file of arrayOfFiles) {
    const isDir = fs.lstatSync(`${workingFolder}${file}`).isDirectory();
    const isGDB = file.slice(-4).toLowerCase() === '.gdb';

    if (isDir && !isGDB) {
      // move contents of this directory to workingFolder
      const subDirectory = `${workingFolder}${file}`;
      console.log(`Moving contents of folder: ${subDirectory} into base folder: ${workingFolder}`);
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
    return collapseUnzippedDir(workingFolder);
  }
  console.log('done collapsing');
};
