const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');
const config = require('config');
const { status } = require('./constants.js');

AWS.config.update({
  region: 'us-east-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

// return all rows by session_id
exports.sessionIdQuery = (table, session_id) => {
  return new Promise((resolve, reject) => {
    const params = {
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

exports.fetchDynamoRecord = function (table, sessionId, uniqueId) {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: TABLE,
      KeyConditionExpression: 'session_id = :hkey and unique_id = :rkey',
      ExpressionAttributeValues: {
        ':hkey': sessionId,
        ':rkey': uniqueId,
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

exports.putDynamoRecord = async function (table, record) {
  return new Promise((resolve, reject) => {
    docClient.put(
      {
        Item: record,
        TableName: TABLE,
      },
      (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      },
    );
  });
};
