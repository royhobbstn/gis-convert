//

exports.tempFolder = '/tempGeoFiles/';
exports.logsFolder = '/logfiles/';

exports.generalStatus = {
  UPLOADING: 'UPLOADING', // upload table only
  WAITING: 'WAITING',
  BUSY: 'BUSY',
  READY: 'READY', // settled
  ERROR: 'ERROR', // settled
};

exports.messageTypes = {
  INFO: 'info',
  CONVERT: 'convert',
};

exports.rowTypes = {
  UPLOAD: 'upload',
  PRODUCT: 'product',
};

// length of logfile entropy
exports.logfileNameLength = 5;
