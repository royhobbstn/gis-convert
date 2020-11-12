import React, { useState } from 'react';
import { Modal, Dropdown, Button, Icon } from 'semantic-ui-react';
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
  const [layersValue, updateLayersValue] = useState([]);

  const uploadLayers = mapLayers(convertModalInfo.info);

  async function runConversion() {
    updateSpinnerIsVisibile(true);

    try {
      const response = await axios.post('/initiateConversion', {
        typeValue,
        layersValue,
        uploadRow: convertModalInfo,
        sessionId: window.localStorage.sessionId,
      });

      updateData(response.data.sessionData.Items);
      updateSpinnerIsVisibile(false);
      updateLayersValue([]);
      updateTypeValue('');
      updateConvertModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Unable to begin file conversion');
    }
  }

  function changeType(e, { value }) {
    updateTypeValue(value);
  }

  function changeLayer(e, { value }) {
    updateLayersValue(value);
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
        <Modal.Description>Choose Layers:</Modal.Description>
        <Dropdown
          onChange={changeLayer}
          clearable
          fluid
          multiple
          selection
          placeholder="Choose Layer(s):"
          options={uploadLayers}
          value={layersValue}
        />
        <br />
        <p>TODO: Warn if choosing an output that only allows one layer.</p>
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

function mapLayers(info) {
  return (info || []).map((item, index) => {
    return {
      key: index,
      value: item.name,
      text: `${item.name} - ${item.type} - ${item.count}`,
    };
  });
}
