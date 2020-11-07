const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

exports.sendSQS = (queue, payload, messageType) => {
  const params = {
    MessageAttributes: {
      messageType: {
        DataType: 'String',
        StringValue: messageType,
      },
    },
    MessageBody: JSON.stringify(payload),
    QueueUrl: queue,
  };

  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err, data) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(data);
      }
    });
  });
};

exports.readMessage = queue => {
  return new Promise((resolve, reject) => {
    const params = {
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ['All'],
      QueueUrl: queue,
    };

    sqs.receiveMessage(params, (err, data) => {
      if (err) {
        return reject(err);
      } else if (data.Messages) {
        return resolve(data);
      } else {
        console.log('Found no messages.');
        return resolve(null);
      }
    });
  });
};

exports.deleteMessage = deleteParams => {
  return new Promise((resolve, reject) => {
    sqs.deleteMessage(deleteParams, err => {
      if (err) {
        return reject(err);
      } else {
        return resolve();
      }
    });
  });
};
