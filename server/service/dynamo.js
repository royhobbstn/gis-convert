const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

// return all rows by session_id
exports.sessionIdQuery = (table, session_id) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: table,
      KeyConditionExpression: 'session_id = :hkey',
      ExpressionAttributeValues: {
        ':hkey': session_id,
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

exports.fetchDynamoRecord = (table, sessionId, uniqueId) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: table,
      KeyConditionExpression: 'session_id = :hkey and unique_id = :rkey',
      ExpressionAttributeValues: {
        ':hkey': sessionId,
        ':rkey': uniqueId,
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

exports.putDynamoRecord = (table, record) => {
  return new Promise((resolve, reject) => {
    const params = {
      Item: record,
      TableName: table,
    };
    docClient.put(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

exports.deleteDynamoRecord = (table, sessionId, uniqueId) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: table,
      Key: {
        session_id: sessionId,
        unique_id: uniqueId,
      },
    };

    docClient.delete(params, (err, data) => {
      if (err) {
        console.log(err);
        console.log('failed to delete dynamo record');
        return reject(err);
      }
      console.log('deleted dynamo record');
      return resolve(data);
    });
  });
};
