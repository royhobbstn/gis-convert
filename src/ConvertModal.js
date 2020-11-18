import React, { useState } from 'react';
import { Modal, Dropdown, Button, Icon, Checkbox } from 'semantic-ui-react';
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
  const [shouldWgs84, updateShouldWgs84] = useState(true);

  async function runConversion() {
    updateSpinnerIsVisibile(true);

    try {
      const response = await axios.post('/initiateConversion', {
        typeValue,
        uploadRow: convertModalInfo,
        sessionId: window.localStorage.sessionId,
        projection: shouldWgs84 ? 'EPSG:4326' : '',
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
        <Checkbox
          label="Convert to WGS-84"
          checked={shouldWgs84}
          onClick={() => updateShouldWgs84(!shouldWgs84)}
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
          <Button color="green" onClick={() => runConversion()}>
            <Icon name="checkmark" /> Run
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  );
}

export default ConvertModal;
