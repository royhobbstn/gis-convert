const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuid } = require('uuid');
const { status } = require('./service/constants.js');

const { uploader } = require('./service/uploader');
const { putDynamoRecord, sessionIdQuery } = require('./service/dynamo');
const { sendSQS, readMessage, deleteMessage } = require('./service/sqs');
const { processMessage } = require('./service/worker');

const app = express();
const port = 4000;
const TABLE = config.get('Dynamo.table');

app.use(bodyParser.json());

// set up worker
let busy = false;

setInterval(async () => {
  if (busy) {
    return;
  }

  try {
    const message = await readMessage();
    if (!message) {
      return;
    }

    busy = true;
    await processMessage(message);
    const deleteParams = {
      ReceiptHandle: message.Messages[0].ReceiptHandle,
      QueueUrl: config.get('SQS.mainQueueUrl'),
    };
    await deleteMessage(deleteParams);
  } catch (e) {
    console.log('unexpected error');
    console.error(e);
  } finally {
    busy = false;
    // clean up temporary directory
  }
}, 30000);

app.put('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const session_id = req.query.token;
    const unique_id = uuid();
    if (!session_id) {
      return res.status(500).json({ error: 'token parameter missing' });
    }

    // create dynamo record
    const record = {
      session_id,
      unique_id,
      row_type: 'upload',
      created: Date.now(),
      modified: Date.now(),
      status: status.UPLOADING,
      data: {},
    };

    await putDynamoRecord(TABLE, record);
    const sessionData = await sessionIdQuery(TABLE, session_id);

    // return data here to user, but endpoint continues
    res.status(200).json({ sessionData });

    const responseS3 = await uploader(req.file);

    record.status = status.UPLOADED;
    record.data = {
      signedUrl: responseS3.signedOriginalUrl,
      key: responseS3.originalFile.key,
      bucket: responseS3.originalFile.bucket,
      location: responseS3.originalFile.Location,
      fileSize: responseS3.fileSize,
      mimeType: responseS3.fileMimetype,
      originalName: responseS3.fileOriginalName,
      fileEncoding: responseS3.fileEncoding,
    };
    await putDynamoRecord(TABLE, record);
    await sendSQS({ session_id, unique_id, key: record.data.key }, 'info');
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/data', async (req, res) => {
  const session_id = req.query.token;
  if (!session_id) {
    return res.status(500).json({ error: 'token parameter missing' });
  }
  const sessionData = await sessionIdQuery(TABLE, session_id);
  return res.status(200).json({ sessionData });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
