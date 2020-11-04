const config = require('config');
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

exports.sendSQS = (payload, messageType) => {
  const params = {
    MessageAttributes: {
      messageType: {
        DataType: 'String',
        StringValue: messageType,
      },
    },
    MessageBody: JSON.stringify(payload),
    QueueUrl: config.get('SQS.mainQueueUrl'),
  };

  console.log(params);

  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, function (err, data) {
      console.log('SQS response: ', { data });
      if (err) {
        console.log(err);
        return reject(err);
      } else {
        return resolve(data);
      }
    });
  });
};

exports.readMessage = () => {
  return new Promise((resolve, reject) => {
    const params = {
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ['All'],
      QueueUrl: config.get('SQS.mainQueueUrl'),
    };

    sqs.receiveMessage(params, async function (err, data) {
      if (err) {
        return reject(err);
      } else if (data.Messages) {
        console.log('Received message.');
        console.log(data);
        return resolve(data);
      } else {
        console.log('Found no messages.');
        return resolve(null);
      }
    });
  });
};

exports.deleteMessage = function (deleteParams) {
  return new Promise((resolve, reject) => {
    sqs.deleteMessage(deleteParams, function (err, data) {
      if (err) {
        return reject(err);
      } else {
        return resolve();
      }
    });
  });
};
