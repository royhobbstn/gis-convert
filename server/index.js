const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuid } = require('uuid');
const { generalStatus, rowTypes, messageTypes } = require('./service/constants.js');

const { uploader } = require('./service/uploader');
const { putDynamoRecord, sessionIdQuery, deleteDynamoRecord } = require('./service/dynamo');
const { sendSQS, readMessage, deleteMessage } = require('./service/sqs');
const { processMessage } = require('./service/worker');
const { deleteS3File } = require('./service/s3.js');

const app = express();
const port = 4000;
const TABLE = config.get('Dynamo.table');
const QUEUE = config.get('SQS.mainQueueUrl');
const BUCKET = config.get('Buckets.mainBucket');

app.use(bodyParser.json());

// set up worker
let busy = false;

setInterval(async () => {
  if (busy) {
    return;
  }
  const message = await readMessage(QUEUE);
  if (!message) {
    return;
  }
  busy = true;
  // delete message immediately.  will never retry.
  const deleteParams = {
    ReceiptHandle: message.Messages[0].ReceiptHandle,
    QueueUrl: QUEUE,
  };
  await deleteMessage(deleteParams);
  const ctx = {};
  ctx.message = message;
  try {
    await processMessage(ctx);
  } catch (err) {
    console.error(err);
    ctx.record.data.message = err.message;
    ctx.record.status = generalStatus.ERROR;
    ctx.record.modified = Date.now();
    console.log('putting error record');
    putDynamoRecord(TABLE, ctx.record).catch(err => {
      console.error(err);
    });
  } finally {
    busy = false;
    // TODO clean up temporary directory
  }
}, 10000);

app.put('/upload-file', upload.single('file'), async (req, res) => {
  const session_id = req.body.token;
  const unique_id = uuid();
  if (!session_id) {
    return res.status(500).json({ error: 'token parameter missing' });
  }

  // create dynamo record
  const record = {
    session_id,
    unique_id,
    row_type: rowTypes.UPLOAD,
    created: Date.now(),
    modified: Date.now(),
    status: generalStatus.UPLOADING,
    data: {
      originalName: req.file.originalname,
    },
  };

  let sessionData;
  try {
    await putDynamoRecord(TABLE, record);
    sessionData = await sessionIdQuery(TABLE, session_id);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  // return data here to user, but endpoint continues
  res.status(200).json({ sessionData });

  let responseS3;
  try {
    responseS3 = await uploader(req.file);
    record.status = generalStatus.WAITING;
    record.modified = Date.now();
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
    await sendSQS(QUEUE, { session_id, unique_id, key: record.data.key }, messageTypes.INFO);
  } catch (err) {
    record.status = generalStatus.ERRORED;
    record.data = {
      main: 'Error in Upload',
      message: err.message,
    };
    record.modified = Date.now();
    putDynamoRecord(TABLE, record).catch(err => {
      console.error(err);
    });
  }
});

app.post('/data', async (req, res) => {
  const session_id = req.body.token;
  if (!session_id) {
    return res.status(500).json({ error: 'token parameter missing' });
  }
  let sessionData;

  try {
    sessionData = await sessionIdQuery(TABLE, session_id);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
  return res.status(200).json({ sessionData });
});

app.delete('/delete-entry', async (req, res) => {
  const session_id = req.body.session_id;
  const unique_id = req.body.unique_id;
  const key = req.body.key;

  if (!session_id || !unique_id) {
    return res.status(500).json({ error: 'parameter(s) missing' });
  }

  try {
    await deleteDynamoRecord(TABLE, session_id, unique_id);
    if (key) {
      await deleteS3File(BUCKET, key);
    }
    const sessionData = await sessionIdQuery(TABLE, session_id);
    return res.status(200).json({ sessionData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/initiateConversion', async (req, res) => {
  const typeValue = req.body.typeValue;
  const uploadRow = req.body.uploadRow;
  const session_id = req.body.sessionId;

  const unique_id = uuid();
  const record = {
    session_id,
    unique_id,
    row_type: rowTypes.PRODUCT,
    created: Date.now(),
    modified: Date.now(),
    status: generalStatus.WAITING,
    data: {
      originalName: uploadRow.data.originalName,
      typeValue,
    },
  };

  let sessionData;
  try {
    await putDynamoRecord(TABLE, record);
    await sendSQS(
      QUEUE,
      { session_id, unique_id, key: uploadRow.data.key, typeValue },
      messageTypes.CONVERT,
    );
    sessionData = await sessionIdQuery(TABLE, session_id);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ sessionData });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
