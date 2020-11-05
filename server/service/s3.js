const AWS = require('aws-sdk');
const fs = require('fs');
const S3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-2' });
const path = require('path');

exports.downloadFileFromS3 = (bucket, key, outputPath) => {
  console.log({ bucket, key, outputPath });
  const options = {
    Bucket: bucket,
    Key: key,
  };

  return new Promise((resolve, reject) => {
    const readStream = S3.getObject(options).createReadStream();
    const writeStream = fs.createWriteStream(path.join(outputPath, key));
    readStream.pipe(writeStream);
    writeStream.on('error', err => {
      reject(err);
    });
    writeStream.on('finish', () => {
      resolve();
    });
  });
};
