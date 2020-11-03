const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');
const config = require('config');

AWS.config.update({
  region: 'us-east-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE = config.get('Dynamo.table');

exports.createUploadRow = async function createUploadRow({ session_id, responseS3 }) {
  const params = {
    TableName: TABLE,
    Item: {
      session_id,
      unique_id: uuid(),
      row_type: 'upload',
      created: Date.now(),
      modified: Date.now(),
      status: 'UPLOADING',
      data: {
        signedUrl: responseS3.signedOriginalUrl,
        key: responseS3.originalFile.key,
        bucket: responseS3.originalFile.bucket,
        location: responseS3.originalFile.Location,
        fileSize: responseS3.fileSize,
        mimeType: responseS3.fileMimetype,
        originalName: responseS3.fileOriginalName,
        fileEncoding: responseS3.fileEncoding,
      },
    },
  };

  return new Promise((resolve, reject) => {
    docClient.put(params, function (err, data) {
      if (err) {
        console.error('Unable to add item');
        return reject(err);
      } else {
        return resolve(data);
      }
    });
  });
};

// return all rows by session_id
exports.sessionIdQuery = session_id => {
  return new Promise((resolve, reject) => {
    var params = {
      TableName: TABLE,
      KeyConditionExpression: 'session_id = :hkey',
      ExpressionAttributeValues: {
        ':hkey': session_id,
      },
    };

    docClient.query(params, function (err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

// create info row

// create product row
