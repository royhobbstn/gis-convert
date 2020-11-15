// @ts-check
const fs = require('fs');
const config = require('config');
const { createLogger, format, transports } = require('winston');
const { logfileNameLength } = require('./constants');
const { combine, timestamp, ms } = format;
const { v4: uuidv4 } = require('uuid');
const { putTextToS3 } = require('./s3.js');
const LOGS_BUCKET = config.get('Buckets.logsBucket');

const generateRef = function (digits) {
  const uuid = uuidv4();
  // @ts-ignore
  const plainString = uuid.replace(/-,/g);
  return plainString.slice(0, digits);
};

const log = createLogger({
  level: 'debug',
  format: combine(timestamp(), ms(), format.json()),
  transports: [
    new transports.Console({
      format: combine(format.colorize(), format.simple()),
    }),
  ],
});

const getUniqueLogfileName = function (serviceName) {
  const ts = Math.round(new Date().getTime() / 1000);
  const entropy = generateRef(logfileNameLength);
  return `${ts}-${serviceName}-${entropy}.log`;
};

const createInstanceLogger = function (fileNameAndPath) {
  const log = createLogger({
    level: 'debug',
    format: combine(timestamp(), ms(), format.json()),
    transports: [
      new transports.Console({
        format: combine(format.colorize(), format.simple()),
        handleExceptions: true,
      }),
      new transports.File({ filename: fileNameAndPath, handleExceptions: true }),
    ],
  });
  return log;
};

async function refreshLogfile(ctx) {
  // give time for log file to be created
  await new Promise(resolve => setTimeout(resolve, 100));
  // read file from disk
  const file = fs.readFileSync(ctx.logpath, 'utf8');
  // put initial logfile into S3
  await putTextToS3(ctx, LOGS_BUCKET, ctx.logfile, file, 'application/x-ndjson');
}

exports.refreshLogfile = refreshLogfile;
exports.generateRef = generateRef;
exports.log = log;
exports.createInstanceLogger = createInstanceLogger;
exports.getUniqueLogfileName = getUniqueLogfileName;
