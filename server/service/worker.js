const config = require('config');
const { tempFolder, generalStatus, messageTypes } = require('./constants.js');
const { v4: uuid } = require('uuid');
const mkdirp = require('mkdirp');
const { extractZip, zipDirectory, collapseUnzippedDir } = require('./filesystem.js');
const { downloadFileFromS3, putZipFileToS3, getSignedUrl } = require('./s3.js');
const { findLikelyFile, getOgrInfo, parseOgrOutput } = require('./ogrInfo.js');
const { convertUsingOgr } = require('./ogrConvert.js');
const { fetchDynamoRecord, putDynamoRecord } = require('./dynamo.js');
const { refreshLogfile } = require('./logger');

const TABLE = config.get('Dynamo.table');
const BUCKET = config.get('Buckets.mainBucket');

exports.processMessage = async ctx => {
  const message = ctx.message.Messages[0];
  const attributes = message.MessageAttributes;
  const messageType = attributes.messageType.StringValue;
  const body = JSON.parse(message.Body);
  const folderId = uuid().slice(0, 6) + '/';
  const workingFolder = tempFolder + folderId;
  mkdirp.sync(workingFolder);
  ctx.workingFolder = workingFolder; // delete this in cleanup

  if (messageType === messageTypes.INFO) {
    await processGeoFileInfo(ctx, workingFolder, body);
  } else if (messageType === messageTypes.CONVERT) {
    await processGeoFileConversion(ctx, workingFolder, body);
  } else {
    throw new Error(`Unexpected MessageType: ${messageType}`);
  }
};

async function processGeoFileInfo(ctx, workingFolder, body) {
  ctx.log.info(`Processing geofile info`);

  const [likelyFile, key] = await setTable(ctx, workingFolder, body);

  // send to ogr-info command line
  const ogrOutput = await getOgrInfo(ctx, likelyFile);

  // parseOgrInfo into JSON.
  const layers = parseOgrOutput(ctx, ogrOutput);

  // Save Info to Dynamo and update status (use same JSON as earlier to avoid re-calling)
  ctx.log.info('Updating record status to READY.');
  ctx.record.info = layers;
  ctx.record.status = generalStatus.READY;
  ctx.record.modified = Date.now();

  await putDynamoRecord(TABLE, ctx.record);
  ctx.log.info('Record status: READY successfully updated.');
  await refreshLogfile(ctx);
}

async function processGeoFileConversion(ctx, workingFolder, body) {
  ctx.log.info(`Processing geofile conversion`);

  const [likelyFile, key] = await setTable(ctx, workingFolder, body);

  const [outputFolder, zipPath, plainKey] = await convertUsingOgr(
    ctx,
    workingFolder,
    likelyFile,
    key,
    body.typeValue,
  );

  zipDirectory(ctx, workingFolder, outputFolder, zipPath);
  await putZipFileToS3(ctx, BUCKET, plainKey, zipPath);

  // get signed URL
  const hours8 = 60 * 60 * 8;
  const signedUrl = await getSignedUrl(BUCKET, plainKey, hours8);

  // attach info to dynamo record
  ctx.record.data.key = plainKey;
  ctx.record.data.signedUrl = signedUrl;
  ctx.record.status = generalStatus.READY;
  ctx.record.modified = Date.now();

  await putDynamoRecord(TABLE, ctx.record);
  ctx.log.info('Record status: READY successfully updated.');
  await refreshLogfile(ctx);
}

// download and unzip file in preparation for ogrinfo or ogr2ogr
async function setTable(ctx, workingFolder, body) {
  const sessionId = body.session_id;
  const uniqueId = body.unique_id;
  const key = body.key;

  ctx.log.info(`Fetching dynamo upload record.`, { sessionId, uniqueId, key });
  const response = await fetchDynamoRecord(TABLE, sessionId, uniqueId);
  ctx.record = response.Items[0];
  ctx.log.info(`Found dynamo record.`, { record: ctx.record });

  ctx.log.info(`modifying status to BUSY`);
  ctx.record.loglink = ctx.loglink;
  ctx.record.status = generalStatus.BUSY;
  ctx.record.modified = Date.now();
  refreshLogfile(ctx).catch(err => {
    ctx.log.error(`Message: ${err.message} Stack: ${err.stack}`);
  });
  await putDynamoRecord(TABLE, ctx.record);
  ctx.log.info(`BUSY status change sucessfull`);

  // load file from S3
  ctx.log.info(`Downloading file from S3: ${key}`);
  await downloadFileFromS3(BUCKET, key, workingFolder);
  ctx.log.info(`S3 download completed successfully`);

  // extract file down from zip if needed.
  const lastFourChars = key.slice(-4);
  let likelyFile = workingFolder + key;

  if (lastFourChars === '.zip') {
    ctx.log.info(`File is a zip file.  Extracting.`);
    extractZip(ctx, workingFolder, key);
    ctx.log.info(`Collapsing directories.`);
    collapseUnzippedDir(ctx, workingFolder);
    ctx.log.info(`Finding most likely file.`);
    likelyFile = findLikelyFile(workingFolder);
  }

  ctx.log.info(`Likely file`, { likelyFile });

  return [likelyFile, key];
}
