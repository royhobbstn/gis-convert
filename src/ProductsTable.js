import React, { useState } from 'react';
import { Table, Icon } from 'semantic-ui-react';
import axios from 'axios';

export function ProductsTable({ data, updateData }) {
  const [rowsBeingDeleted, updateRowsBeingDeleted] = useState([]);

  function deleteUpload(unique_id, key) {
    updateRowsBeingDeleted([...rowsBeingDeleted, unique_id]);
    const token = window.localStorage.getItem('sessionId');
    axios
      .delete(`/delete-entry`, {
        data: {
          session_id: token,
          unique_id: unique_id,
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

  return (
    <React.Fragment>
      <p
        style={{
          maxWidth: '800px',
          margin: 'auto',
          fontWeight: 'bold',
          padding: '5px',
          fontSize: '18px',
        }}
      >
        Products
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
            <Table.HeaderCell>Link</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Output Filename</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Status</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Log</Table.HeaderCell>
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
                <Table.Cell width={3}>
                  {new Date(Number(row.created)).toLocaleTimeString()}
                </Table.Cell>
                <Table.Cell width={4}>{row.data.key}</Table.Cell>
                <Table.Cell width={1}>{row.data.typeValue}</Table.Cell>
                <Table.Cell width={1}>{row.status}</Table.Cell>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  {row.loglink ? (
                    <a href={row.loglink} target="_blank" rel="noreferrer">
                      <Icon fitted name="sticky note outline" />
                    </a>
                  ) : null}
                </Table.Cell>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  <div role="button" style={{ cursor: 'pointer' }}>
                    {rowsBeingDeleted.includes(row.unique_id) ? (
                      <Icon style={{ color: 'black' }} loading fitted name="spinner" />
                    ) : (
                      <Icon
                        style={{ color: 'grey' }}
                        fitted
                        name="trash alternate outline"
                        onClick={() => deleteUpload(row.unique_id, row.data.key)}
                      />
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </React.Fragment>
  );
}
