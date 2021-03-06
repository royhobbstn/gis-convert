const AWS = require('aws-sdk');
const fs = require('fs');
const S3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-2' });
const path = require('path');
const stream = require('stream');

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

exports.deleteS3File = (bucket, key) => {
  return new Promise((resolve, reject) => {
    S3.deleteObject(
      {
        Bucket: bucket,
        Key: key,
      },
      (err, data) => {
        if (err) {
          console.log('delete failed');
          return reject(err);
        }
        console.log('delete succeeded');
        console.log(data);
        return resolve(data);
      },
    );
  });
};

exports.putZipFileToS3 = function (ctx, bucket, key, filePathToUpload) {
  return new Promise((resolve, reject) => {
    ctx.log.info(
      `uploading file to s3 (${filePathToUpload} as s3://${bucket}/${key}), please wait...`,
    );

    const uploadStream = () => {
      const pass = new stream.PassThrough();

      let params = {
        Bucket: bucket,
        Key: key,
        Body: pass,
        ContentType: 'application/zip',
        ContentDisposition: `attachment; filename="${key}"`,
      };

      return {
        writeStream: pass,
        promise: S3.upload(params).promise(),
      };
    };
    const { writeStream, promise } = uploadStream();
    const readStream = fs.createReadStream(filePathToUpload);
    readStream.pipe(writeStream);

    promise
      .then(result => {
        ctx.log.info(
          `uploading (${filePathToUpload} as s3://${bucket}/${key}) completed successfully.`,
        );
        ctx.log.info('result', result);
        return resolve();
      })
      .catch(err => {
        ctx.log.error(`upload (${filePathToUpload} as s3://${bucket}/${key}) failed.`);
        ctx.log.error(`Error: ${err.message}, ${err.stack}`);
        return reject(err);
      });
  });
};

exports.getSignedUrl = (bucket, key, expiration) => {
  const signedUrl = S3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: expiration,
  });
  return signedUrl;
};

exports.putTextToS3 = function (ctx, bucketName, keyName, text, contentType) {
  return new Promise((resolve, reject) => {
    const objectParams = {
      Bucket: bucketName,
      Key: keyName,
      Body: text,
      ContentType: contentType,
    };

    const uploadPromise = S3.putObject(objectParams).promise();
    uploadPromise
      .then(data => {
        ctx.log.info(`Successfully uploaded data to s3`);
        ctx.log.info('upload response', { data });
        return resolve();
      })
      .catch(err => {
        ctx.log.error('Error', { err: err.message, stack: err.stack });
        return reject(err);
      });
  });
};
