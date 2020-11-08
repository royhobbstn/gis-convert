import React from 'react';
import { Modal } from 'semantic-ui-react';

export function ConvertModal({ convertModalOpen, updateConvertModalOpen, convertModalInfo }) {
  return (
    <Modal
      onClose={() => updateConvertModalOpen(false)}
      onOpen={() => updateConvertModalOpen(true)}
      open={convertModalOpen}
      closeIcon
      size="medium"
    >
      <Modal.Header>Convert Dataset</Modal.Header>
      <Modal.Content>
        <Modal.Description>{JSON.stringify(convertModalInfo)}</Modal.Description>
      </Modal.Content>
    </Modal>
  );
}

export default ConvertModal;
