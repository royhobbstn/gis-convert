//fileUploaderHome.js
'use strict';
const AWS = require('aws-sdk');
const { v4: uuid } = require('uuid');
const s3 = new AWS.S3();

const bucket = process.env.BUCKET;
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
  try {
    console.log(file);

    const uid = uuid();
    const originalKey = `${uid}_${file.originalname}`;
    const originalFile = await uploadToS3(bucket, originalKey, file.buffer, file.mimetype);

    console.log({ originalFile });
    const signedOriginalUrl = s3.getSignedUrl('getObject', {
      Bucket: originalFile.Bucket,
      Key: originalKey,
      Expires: 60000,
    });
    console.log({ signedOriginalUrl });

    return {
      statusCode: 200,
      body: {
        id: uid,
        mimeType: file.mimetype,
        originalKey: originalFile.key,
        bucket: originalFile.Bucket,
        fileName: originalKey,
        originalUrl: signedOriginalUrl,
      },
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: { error: e.message } };
  }
};
