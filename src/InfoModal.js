import React from 'react';
import { Table, Modal } from 'semantic-ui-react';

export function InfoModal({ infoModalOpen, updateInfoModalOpen, infoModalInfo }) {
  console.log(infoModalInfo);
  return (
    <Modal
      onClose={() => updateInfoModalOpen(false)}
      onOpen={() => updateInfoModalOpen(true)}
      open={infoModalOpen}
      closeIcon
      size="small"
    >
      <Modal.Header>Dataset Layers</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <Table
            unstackable
            celled
            compact
            style={{
              display: 'block',
              maxWidth: '100%',
              margin: 'auto',
              maxHeight: '250px',
              overflow: 'auto',
              marginBottom: '20px',
            }}
          >
            <Table.Header style={{ position: 'sticky' }}>
              <Table.Row>
                <Table.HeaderCell>Layer Type</Table.HeaderCell>
                <Table.HeaderCell>Layer Name</Table.HeaderCell>
                <Table.HeaderCell>Features</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {infoModalInfo.map((row, index) => {
                return (
                  <Table.Row key={index}>
                    <Table.Cell width={4}>{row.type}</Table.Cell>
                    <Table.Cell width={9}>{row.name}</Table.Cell>
                    <Table.Cell width={3}>{row.count}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  );
}

export default InfoModal;
