import React, { useState } from 'react';
import { Table, Icon, Button } from 'semantic-ui-react';
import axios from 'axios';
import InfoModal from './InfoModal';
import ConvertModal from './ConvertModal';

export function UploadsTable({ data, updateData }) {
  const [infoModalOpen, updateInfoModalOpen] = useState(false);
  const [infoModalInfo, updateInfoModalInfo] = useState([]);
  const [rowsBeingDeleted, updateRowsBeingDeleted] = useState([]);
  const [convertModalInfo, updateConvertModalInfo] = useState({});
  const [convertModalOpen, updateConvertModalOpen] = useState(false);

  function deleteUpload(unique_id, key) {
    updateRowsBeingDeleted([...rowsBeingDeleted, unique_id]);
    const token = window.localStorage.getItem('sessionId');
    axios
      .delete(`/delete-upload`, {
        data: {
          token,
          unique: unique_id,
          key,
        },
      })
      .then(response => {
        updateData(response.data.sessionData.Items);
      })
      .catch(e => {
        console.error(e);
        alert('Unable to delete upload!');
      })
      .finally(() => {
        updateRowsBeingDeleted(rowsBeingDeleted.filter(row => row.unique_id !== unique_id));
      });
  }

  function updateInfoModal(info) {
    updateInfoModalInfo(info);
    updateInfoModalOpen(true);
  }

  function convertUpload(row) {
    updateConvertModalInfo(row);
    updateConvertModalOpen(true);
  }

  return (
    <React.Fragment>
      <InfoModal
        infoModalOpen={infoModalOpen}
        infoModalInfo={infoModalInfo}
        updateInfoModalOpen={updateInfoModalOpen}
      />
      <ConvertModal
        updateData={updateData}
        convertModalOpen={convertModalOpen}
        convertModalInfo={convertModalInfo}
        updateConvertModalOpen={updateConvertModalOpen}
      />
      <p
        style={{
          maxWidth: '800px',
          margin: 'auto',
          fontWeight: 'bold',
          padding: '5px',
          fontSize: '18px',
        }}
      >
        Uploads
      </p>
      <Table
        unstackable
        celled
        compact
        style={{
          display: 'block',
          maxWidth: '800px',
          margin: 'auto',
          maxHeight: '250px',
          overflow: 'auto',
          marginBottom: '20px',
        }}
      >
        <Table.Header style={{ position: 'sticky' }}>
          <Table.Row>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>Last Modified</Table.HeaderCell>
            <Table.HeaderCell>File</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Status</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Convert</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Info</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.map(row => {
            return (
              <Table.Row key={row.unique_id}>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  {row.status === 'READY' ? (
                    <a href={row.data.signedUrl} target="_blank" rel="noreferrer">
                      <Icon fitted name="linkify" />
                    </a>
                  ) : null}
                </Table.Cell>
                <Table.Cell width={4}>
                  {new Date(Number(row.modified)).toLocaleTimeString()}
                </Table.Cell>
                <Table.Cell width={5}>{row.data.originalName}</Table.Cell>
                <Table.Cell width={1}>{row.status}</Table.Cell>
                <Table.Cell width={2} style={{ textAlign: 'center' }}>
                  {row.status === 'READY' ? (
                    <Button compact onClick={() => convertUpload(row)}>
                      Convert
                    </Button>
                  ) : null}
                </Table.Cell>
                <Table.Cell width={2} style={{ textAlign: 'center' }}>
                  {row.status === 'READY' ? (
                    <Button compact onClick={() => updateInfoModal(row.info)}>
                      Info
                    </Button>
                  ) : null}
                </Table.Cell>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  {row.status === 'READY' ? (
                    <div role="button" style={{ cursor: 'pointer' }}>
                      {rowsBeingDeleted.includes(row.unique_id) ? (
                        <Icon style={{ color: 'black' }} loading fitted name="spinner" />
                      ) : (
                        <Icon
                          style={{ color: 'grey' }}
                          fitted
                          name="trash"
                          onClick={() => deleteUpload(row.unique_id, row.data.key)}
                        />
                      )}
                    </div>
                  ) : null}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </React.Fragment>
  );
}
