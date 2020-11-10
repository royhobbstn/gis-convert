import React, { useState } from 'react';
import { Table, Icon, Button } from 'semantic-ui-react';
import axios from 'axios';

export function ProductsTable({ data, updateData }) {
  const [rowsBeingDeleted, updateRowsBeingDeleted] = useState([]);

  console.log({ uploads: data });

  function deleteUpload(unique_id, key) {
    updateRowsBeingDeleted([...rowsBeingDeleted, unique_id]);
    const token = window.localStorage.getItem('sessionId');
    axios
      .delete(`/delete-upload?token=${token}&unique=${unique_id}&key=${key}`)
      .then(response => {
        // response is all records with current sessionId
        console.log(response);
        updateRowsBeingDeleted(rowsBeingDeleted.filter(row => row.unique_id !== unique_id));
        updateData(response.data.sessionData.Items);
      })
      .catch(e => {
        console.log('error');
        console.log(e);
        alert('Unable to delete upload!');
      });
  }

  return (
    <React.Fragment>
      <p style={{ maxWidth: '800px', margin: 'auto', fontWeight: 'bold' }}>Products</p>
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
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell>File</Table.HeaderCell>
            <Table.HeaderCell style={{ textAlign: 'center' }}>Status</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.map(row => {
            return (
              <Table.Row key={row.unique_id}>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  <a href={row.data.signedUrl} target="_blank" rel="noreferrer">
                    <Icon fitted name="linkify" />
                  </a>
                </Table.Cell>
                <Table.Cell width={4}>{new Date(Number(row.created)).toLocaleString()}</Table.Cell>
                <Table.Cell width={5}>{row.data.originalName}</Table.Cell>
                <Table.Cell width={1}>{row.status}</Table.Cell>
                <Table.Cell width={1} style={{ textAlign: 'center' }}>
                  {row.status === 'READY' ? (
                    <div role="button" style={{ cursor: 'pointer' }}>
                      {rowsBeingDeleted.includes(row.unique_id) ? (
                        <Icon style={{ color: 'black' }} loading fitted name="spinner" />
                      ) : (
                        <Icon
                          style={{ color: 'red' }}
                          fitted
                          name="remove"
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
