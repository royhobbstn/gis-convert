const fs = require('fs');
const http = require('http');
const https = require('https');
const mkdirp = require('mkdirp');
const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuid } = require('uuid');
const {
  generalStatus,
  rowTypes,
  messageTypes,
  logsFolder,
  tempFolder,
} = require('./service/constants.js');
const { uploader } = require('./service/uploader');
const { putDynamoRecord, sessionIdQuery, deleteDynamoRecord } = require('./service/dynamo');
const { sendSQS, readMessage, deleteMessage } = require('./service/sqs');
const { processMessage } = require('./service/worker');
const { deleteS3File, getSignedUrl } = require('./service/s3.js');
const { cleanDirectory, createDirectories } = require('./service/filesystem');
const {
  generateRef,
  createInstanceLogger,
  getUniqueLogfileName,
  refreshLogfile,
} = require('./service/logger');
const { sendAlertMail } = require('./service/email');
const helmet = require('helmet');

const app = express();
const TABLE = config.get('Dynamo.table');
const QUEUE = config.get('SQS.mainQueueUrl');
const BUCKET = config.get('Buckets.mainBucket');
const LOGS_BUCKET = config.get('Buckets.logsBucket');

app.use(bodyParser.json());
app.use(express.static('build'));
app.use(helmet());

process.on('uncaughtException', async function (err) {
  console.log(err);
  await sendAlertMail(
    `Convert-Geo Error`,
    JSON.stringify({ err: err.message, stack: err.stack }, null, '\t'),
  );
});

if (process.env.NODE_ENV === 'production') {
  app.use(function (req, res, next) {
    if (req.secure) {
      // request was via https, so do no special handling
      next();
    } else {
      // request was via http, so redirect to https
      res.redirect('https://' + req.headers.host + req.url);
    }
  });
}

createDirectories([tempFolder, logsFolder]);

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

  const directoryId = generateRef(6);
  const logfile = getUniqueLogfileName(
    message.Messages[0].MessageAttributes.messageType.StringValue,
  );
  const logsFolderUnique = logsFolder + directoryId;
  mkdirp.sync(logsFolderUnique);
  const logpath = `${logsFolderUnique}/${logfile}`;
  const log = createInstanceLogger(logpath);
  ctx.log = log;
  ctx.logsFolderUnique = logsFolderUnique; // delete this in cleanup
  ctx.logfile = logfile;
  ctx.logpath = logpath;

  // first logfile message is here.  we know a file now exists.
  ctx.log.info('message received', message);

  await refreshLogfile(ctx);

  // create signed URL once.
  const hours24 = 60 * 60 * 24;
  const signedUrl = getSignedUrl(LOGS_BUCKET, logfile, hours24);

  // add signed url to dynamo record
  ctx.loglink = signedUrl;

  try {
    await processMessage(ctx);
  } catch (err) {
    ctx.log.error(`Message: ${err.message} Stack: ${err.stack}`);
    ctx.record.data.message = err.message;
    ctx.record.status = generalStatus.ERROR;
    ctx.record.modified = Date.now();
    ctx.record.loglink = ctx.loglink;
    ctx.log.info('putting error record to dynamo', { record: ctx.record });
    try {
      await putDynamoRecord(TABLE, ctx.record);
      await refreshLogfile(ctx);
    } catch (err) {
      console.error(`Message: ${err.message} Stack: ${err.stack}`);
    }
  } finally {
    busy = false;
    if (ctx.logsFolderUnique) {
      await cleanDirectory(ctx.logsFolderUnique);
    }
    if (ctx.workingFolder) {
      await cleanDirectory(ctx.workingFolder);
    }
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
    expires: Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000), // one day in MS
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
  const projection = req.body.projection;

  const unique_id = uuid();
  const record = {
    session_id,
    unique_id,
    row_type: rowTypes.PRODUCT,
    created: Date.now(),
    modified: Date.now(),
    expires: Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000), // one day in MS
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
      { session_id, unique_id, key: uploadRow.data.key, typeValue, projection },
      messageTypes.CONVERT,
    );
    sessionData = await sessionIdQuery(TABLE, session_id);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ sessionData });
});

if (process.env.NODE_ENV === 'development') {
  const httpServer = http.createServer(app);
  httpServer.listen(8080, () => {
    console.log(`Example app listening at http://localhost:8080`);
  });
} else if (process.env.NODE_ENV === 'production') {
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/convert-geo.com/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/convert-geo.com/cert.pem', 'utf8');
  const ca = fs.readFileSync('/etc/letsencrypt/live/convert-geo.com/chain.pem', 'utf8');

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  httpsServer = https.createServer(credentials, app);

  httpsServer.listen(8443, () => {
    console.log(`Example app listening at http://localhost:8443`);
  });
} else {
  throw new Error('Please specify environment!');
}
