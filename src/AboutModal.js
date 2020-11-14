import React from 'react';
import { Modal } from 'semantic-ui-react';

export function AboutModal({ aboutModalOpen, updateAboutModalOpen }) {
  return (
    <Modal
      onClose={() => updateAboutModalOpen(false)}
      onOpen={() => updateAboutModalOpen(true)}
      open={aboutModalOpen}
      closeIcon
      size="small"
    >
      <Modal.Header>About this Page</Modal.Header>
      <Modal.Content>
        <Modal.Description>Convert to Type:</Modal.Description>
      </Modal.Content>
    </Modal>
  );
}

export default AboutModal;
