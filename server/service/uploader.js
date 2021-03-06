//fileUploaderHome.js
'use strict';
const AWS = require('aws-sdk');
const { v4: uuid } = require('uuid');
const config = require('config');
const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: 'us-east-2',
});

const bucket = config.get('Buckets.mainBucket');
const MAX_SIZE = 10000000; // ~10MB

const uploadToS3 = (bucket, key, buffer, mimeType) =>
  new Promise((resolve, reject) => {
    s3.upload({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType }, function (
      err,
      data,
    ) {
      if (err) reject(err);
      resolve(data);
    });
  });

exports.uploader = async file => {
  const uniqueId = uuid().slice(0, 6);
  const originalKey = `${uniqueId}_${file.originalname}`;
  const originalFile = await uploadToS3(bucket, originalKey, file.buffer, file.mimetype);

  const hours24 = 60 * 60 * 24;
  const signedOriginalUrl = s3.getSignedUrl('getObject', {
    Bucket: originalFile.Bucket,
    Key: originalKey,
    Expires: hours24,
  });

  return {
    fileSize: file.size,
    fileOriginalName: file.originalname,
    fileEncoding: file.encoding,
    fileMimetype: file.mimetype,
    uniqueId,
    originalKey,
    originalFile,
    signedOriginalUrl,
  };
};
