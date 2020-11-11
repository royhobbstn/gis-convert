const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuid } = require('uuid');
const { uploadStatus, productStatus, rowTypes, messageTypes } = require('./service/constants.js');

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

  try {
    const message = await readMessage(QUEUE);
    if (!message) {
      return;
    }

    busy = true;
    await processMessage(message);
    const deleteParams = {
      ReceiptHandle: message.Messages[0].ReceiptHandle,
      QueueUrl: QUEUE,
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
      row_type: rowTypes.UPLOAD,
      created: Date.now(),
      modified: Date.now(),
      status: uploadStatus.UPLOADING,
      data: {
        originalName: req.file.originalname,
      },
    };

    await putDynamoRecord(TABLE, record);
    const sessionData = await sessionIdQuery(TABLE, session_id);

    // return data here to user, but endpoint continues
    res.status(200).json({ sessionData });

    const responseS3 = await uploader(req.file);

    record.status = uploadStatus.UPLOADED;
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

app.delete('/delete-upload', async (req, res) => {
  const session_id = req.query.token;
  const unique_id = req.query.unique;
  const key = req.query.key;
  if (!session_id || !unique_id || !key) {
    return res.status(500).json({ error: 'parameter(s) missing' });
  }

  try {
    await deleteDynamoRecord(TABLE, session_id, unique_id);
    await deleteS3File(BUCKET, key);
    const sessionData = await sessionIdQuery(TABLE, session_id);
    return res.status(200).json({ sessionData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/initiateConversion', async (req, res) => {
  const layersValue = req.body.layersValue;
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
    status: productStatus.WAITING,
    data: {
      originalName: uploadRow.data.originalName,
      layersValue,
      typeValue,
    },
  };

  await putDynamoRecord(TABLE, record);
  await sendSQS(
    QUEUE,
    { session_id, unique_id, key: uploadRow.data.key, layersValue, typeValue },
    messageTypes.CONVERT,
  );
  const sessionData = await sessionIdQuery(TABLE, session_id);
  return res.status(200).json({ sessionData });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
