//fileUploaderHome.js
'use strict';
const AWS = require('aws-sdk');
const { v4: uuid } = require('uuid');
const s3 = new AWS.S3();
const formParser = require('./formParser');

const bucket = process.env.Bucket;
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

module.exports.uploader = async event => {
  try {
    const formData = await formParser.parser(event, MAX_SIZE);
    const file = formData.files[0];

    const uid = uuid();
    const originalKey = `${uid}_original_${file.filename}`;
    const originalFile = await uploadToS3(bucket, originalKey, file.content, file.contentType);

    const signedOriginalUrl = s3.getSignedUrl('getObject', {
      Bucket: originalFile.Bucket,
      Key: originalKey,
      Expires: 60000,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: uid,
        mimeType: file.contentType,
        originalKey: originalFile.key,
        bucket: originalFile.Bucket,
        fileName: file.filename,
        originalUrl: signedOriginalUrl,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify(e.message) };
  }
};
