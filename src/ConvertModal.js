import React, { useState } from 'react';
import { Modal, Dropdown, Button, Icon, Radio, Input } from 'semantic-ui-react';
import { ogrDrivers } from './lookup/ogrDrivers';
import axios from 'axios';

export function ConvertModal({
  convertModalOpen,
  updateConvertModalOpen,
  convertModalInfo,
  updateData,
}) {
  const [spinnerIsVisible, updateSpinnerIsVisibile] = useState(false);
  const [typeValue, updateTypeValue] = useState('');
  const [radioValue, updateRadioValue] = useState('1');
  const [epsg, updateEpsg] = useState('');
  const [projError, updateProjError] = useState(false);

  function validateProjInput(textValue, radioValue) {
    if (radioValue !== '3') {
      updateProjError(false);
      return;
    }
    if (textValue.length !== 4) {
      updateProjError(true);
      return;
    }

    const strArr = textValue.split('');
    for (let char of strArr) {
      if (!['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(char)) {
        updateProjError(true);
        return;
      }
    }
    updateProjError(false);
  }

  async function runConversion() {
    updateSpinnerIsVisibile(true);

    try {
      const response = await axios.post('/initiateConversion', {
        typeValue,
        uploadRow: convertModalInfo,
        sessionId: window.localStorage.sessionId,
        projection: getProjection(epsg, radioValue),
      });

      updateData(response.data.sessionData.Items);
      updateConvertModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Unable to begin file conversion');
    } finally {
      updateTypeValue('');
      updateSpinnerIsVisibile(false);
    }
  }

  function changeType(e, { value }) {
    updateTypeValue(value);
  }

  return (
    <Modal
      onClose={() => updateConvertModalOpen(false)}
      onOpen={() => updateConvertModalOpen(true)}
      open={convertModalOpen}
      closeIcon
      size="small"
    >
      <Modal.Header>Convert Dataset</Modal.Header>
      <Modal.Content>
        <Modal.Description>Convert to Type:</Modal.Description>
        <Dropdown
          onChange={changeType}
          clearable
          fluid
          selection
          placeholder="Convert To Type:"
          options={ogrDrivers}
          value={typeValue}
        />
        <br />
        <Radio
          style={{ padding: '5px 0' }}
          label="Keep Original Projection"
          name="radioGroup"
          value="1"
          checked={radioValue === '1'}
          onChange={() => {
            validateProjInput(epsg, '1');
            updateRadioValue('1');
          }}
        />
        <br />
        <Radio
          style={{ padding: '5px 0' }}
          label="WGS84"
          name="radioGroup"
          value="2"
          checked={radioValue === '2'}
          onChange={() => {
            validateProjInput(epsg, '2');
            updateRadioValue('2');
          }}
        />
        <br />
        <Radio
          label="EPSG: "
          name="radioGroup"
          value="3"
          checked={radioValue === '3'}
          onChange={() => {
            validateProjInput(epsg, '3');
            updateRadioValue('3');
          }}
        />
        <Input
          size="mini"
          style={{ marginLeft: '10px', width: '60px' }}
          error={projError}
          value={epsg}
          onChange={evt => {
            console.log(evt.target.value);
            validateProjInput(evt.target.value, radioValue);
            updateEpsg(evt.target.value);
          }}
        />
        <br />
      </Modal.Content>
      <Modal.Actions>
        {spinnerIsVisible ? (
          <Icon
            style={{ color: 'black', width: '90px', marginBottom: '10px' }}
            size="big"
            loading
            name="spinner"
          />
        ) : (
          <Button color="green" disabled={projError || !typeValue} onClick={() => runConversion()}>
            <Icon name="checkmark" /> Run
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  );
}

export default ConvertModal;

function getProjection(epsg, radioValue) {
  if (radioValue === '1') {
    return '';
  }
  if (radioValue === '2') {
    return '4326';
  }
  if (radioValue === '3') {
    return epsg;
  }
}
