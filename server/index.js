const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { uploader } = require('./service/uploader');
const { createUploadRow, sessionIdQuery } = require('./service/dynamo');
const { sendSQS, readMessage, deleteMessage } = require('./service/sqs');
const { processMessage } = require('./service/worker');

const app = express();
const port = 4000;

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
  }
}, 30000);

app.put('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const session_id = req.query.token;
    if (!session_id) {
      return res.status(500).json({ error: 'token parameter missing' });
    }
    const responseS3 = await uploader(req.file);
    const row = await createUploadRow({ session_id, responseS3 });
    console.log(row);
    await sendSQS(row, 'info');
    const sessionData = await sessionIdQuery(session_id);
    return res.status(200).json({ sessionData });
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
  const sessionData = await sessionIdQuery(session_id);
  return res.status(200).json({ sessionData });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
