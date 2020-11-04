exports.processMessage = async incomingPayload => {
  console.log('processing');
  console.log(incomingPayload);

  const message = incomingPayload.Messages[0];
  const attributes = message.MessageAttributes;
  const messageType = attributes.messageType.StringValue;
  const body = JSON.stringify(message.Body);

  console.log({ attributes, body });

  if (messageType === 'info') {
    await processGeoFileInfo(body);
  } else if (messageType === 'convert') {
    await processGeoFileConversion(body);
  } else {
    throw new Error(`Unexpected MessageType: ${messageType}`);
  }
};

async function processGeoFileInfo() {
  //
}

async function processGeoFileConversion() {
  //
}
