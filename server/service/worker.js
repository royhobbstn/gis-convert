const config = require('config');
const { tempFolder, generalStatus, messageTypes } = require('./constants.js');
const { v4: uuid } = require('uuid');
const mkdirp = require('mkdirp');
const { extractZip, zipDirectory, collapseUnzippedDir } = require('./filesystem.js');
const { downloadFileFromS3, putZipFileToS3, getSignedUrl } = require('./s3.js');
const { findLikelyFile, getOgrInfo, parseOgrOutput } = require('./ogrInfo.js');
const { convertUsingOgr } = require('./ogrConvert.js');
const { fetchDynamoRecord, putDynamoRecord } = require('./dynamo.js');
const TABLE = config.get('Dynamo.table');
const BUCKET = config.get('Buckets.mainBucket');

exports.processMessage = async incomingPayload => {
  const message = incomingPayload.Messages[0];
  const attributes = message.MessageAttributes;
  const messageType = attributes.messageType.StringValue;
  const body = JSON.parse(message.Body);
  const folderId = uuid().slice(0, 6) + '/';
  const workingFolder = tempFolder + folderId;
  mkdirp.sync(workingFolder);

  if (messageType === messageTypes.INFO) {
    await processGeoFileInfo(workingFolder, body);
  } else if (messageType === messageTypes.CONVERT) {
    await processGeoFileConversion(workingFolder, body);
  } else {
    throw new Error(`Unexpected MessageType: ${messageType}`);
  }
};

async function processGeoFileInfo(workingFolder, body) {
  try {
    const sessionId = body.session_id;
    const uniqueId = body.unique_id;
    const key = body.key;

    // fetch DYNAMO record
    const response = await fetchDynamoRecord(TABLE, sessionId, uniqueId);
    const record = response.Items[0];

    // update status in Dynamo from UPLOADED to BUSY
    record.status = generalStatus.BUSY;
    record.modified = Date.now();
    await putDynamoRecord(TABLE, record);

    // load file from S3
    await downloadFileFromS3(BUCKET, key, workingFolder);

    // extract file down from zip if needed.
    const lastFourChars = key.slice(-4);
    let likelyFile = workingFolder + key;
    // A BIG TODO: use /vsizip/ and /vsis3/ in place of below
    if (lastFourChars === '.zip') {
      extractZip(workingFolder, key);
      collapseUnzippedDir(workingFolder);
      likelyFile = findLikelyFile(workingFolder);
    }

    // send to ogr-info command line
    const ogrOutput = await getOgrInfo(likelyFile);

    // parseOgrInfo into JSON.
    const layers = parseOgrOutput(ogrOutput);

    // Save Info to Dynamo and update status (use same JSON as earlier to avoid re-calling)
    record.info = layers;
    record.status = generalStatus.READY;
    record.modified = Date.now();
    await putDynamoRecord(TABLE, record);
  } catch (err) {
    console.error(err);
    record.data = {
      main: 'Error in Info',
      message: err.message,
    };
    record.modified = Date.now();
    await putDynamoRecord(TABLE, record);
    putDynamoRecord(TABLE, record).catch(err => {
      console.error(err);
    });
  }
}

async function processGeoFileConversion(workingFolder, body) {
  const sessionId = body.session_id;
  const uniqueId = body.unique_id;
  const key = body.key;

  // fetch DYNAMO record
  const response = await fetchDynamoRecord(TABLE, sessionId, uniqueId);
  const record = response.Items[0];

  // update status in Dynamo from UPLOADED to BUSY
  record.status = generalStatus.BUSY;
  record.modified = Date.now();
  await putDynamoRecord(TABLE, record);

  // load file from S3
  await downloadFileFromS3(BUCKET, key, workingFolder);

  // extract file down from zip if needed.
  const lastFourChars = key.slice(-4);
  let likelyFile = workingFolder + key;

  if (lastFourChars === '.zip') {
    extractZip(workingFolder, key);
    collapseUnzippedDir(workingFolder);
    likelyFile = findLikelyFile(workingFolder);
  }

  try {
    const [outputFolder, zipPath, plainKey] = await convertUsingOgr(
      workingFolder,
      likelyFile,
      key,
      body.typeValue,
    );

    zipDirectory(workingFolder, outputFolder, zipPath);
    await putZipFileToS3(BUCKET, plainKey, zipPath);

    // get signed URL
    const hours8 = 60 * 60 * 8;
    const signedUrl = await getSignedUrl(BUCKET, plainKey, hours8);

    // attach info to dynamo record
    record.data.key = plainKey;
    record.data.signedUrl = signedUrl;
    record.status = generalStatus.READY;
    record.modified = Date.now();
    await putDynamoRecord(TABLE, record);
  } catch (err) {
    console.error(err);
    record.data = {
      main: 'Error in Upload',
      message: err.message,
    };
    record.modified = Date.now();
    await putDynamoRecord(TABLE, record);
    putDynamoRecord(TABLE, record).catch(err => {
      console.error(err);
    });
  }
}

// download and unzip file in preparation for ogrinfo or ogr2ogr
async function setTable(workingFolder, body) {
  const sessionId = body.session_id;
  const uniqueId = body.unique_id;
  const key = body.key;

  // fetch DYNAMO record
  const response = await fetchDynamoRecord(TABLE, sessionId, uniqueId);
  const record = response.Items[0];

  // update status in Dynamo from Uploaded to SCANNING
  record.status = generalStatus.BUSY;
  record.modified = Date.now();
  await putDynamoRecord(TABLE, record);

  // load file from S3
  await downloadFileFromS3(BUCKET, key, workingFolder);

  // extract file down from zip if needed.
  const lastFourChars = key.slice(-4);
  let likelyFile = workingFolder + key;

  if (lastFourChars === '.zip') {
    extractZip(workingFolder, key);
    collapseUnzippedDir(workingFolder);
    likelyFile = findLikelyFile(workingFolder);
  }
}
