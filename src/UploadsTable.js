import React from 'react';
import { Table, Icon, Button } from 'semantic-ui-react';

export function UploadsTable({ data }) {
  const rows = parseUploadsData(data);

  function deleteUpload() {
    console.log('deletetodo');
  }

  return (
    <Table unstackable celled compact style={{ maxWidth: '800px', margin: 'auto' }}>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell></Table.HeaderCell>
          <Table.HeaderCell>Date</Table.HeaderCell>
          <Table.HeaderCell>File</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>Status</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>Convert</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>Info</Table.HeaderCell>
          <Table.HeaderCell></Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {rows.map(row => {
          return (
            <Table.Row key={row.unique_id}>
              <Table.Cell style={{ textAlign: 'center' }}>
                <a href={row.data.signedUrl} target="_blank" rel="noreferrer">
                  <Icon fitted name="linkify" />
                </a>
              </Table.Cell>
              <Table.Cell>{new Date(Number(row.created)).toLocaleString()}</Table.Cell>
              <Table.Cell>{row.data.originalName}</Table.Cell>
              <Table.Cell>{row.status}</Table.Cell>
              <Table.Cell>{row.status === 'READY' ? <Button>Convert</Button> : null}</Table.Cell>
              <Table.Cell>
                {row.status === 'READY' ? (
                  <div role="button" style={{ cursor: 'pointer' }}>
                    <Icon
                      style={{ color: 'red' }}
                      fitted
                      name="remove"
                      onClick={() => deleteUpload(row.unique_id)}
                    />
                  </div>
                ) : null}
              </Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>
                <div role="button" style={{ cursor: 'pointer' }}>
                  <Icon
                    style={{ color: 'red' }}
                    fitted
                    name="remove"
                    onClick={() => deleteUpload(row.unique_id)}
                  />
                </div>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}

function parseUploadsData(data) {
  return data;
}

// created: 1604404452113
// data:
// fileEncoding: "7bit"
// fileSize: 449
// key: "390f48af-0522-4c82-b03c-a9aad294b7db_zeytech"
// location: "https://upload-gis-file-dev.s3.us-east-2.amazonaws.com/390f48af-0522-4c82-b03c-a9aad294b7db_zeytech"
// mimeType: "application/octet-stream"
// originalName: "zeytech"
// signedUrl: "https://upload-gis-file-dev.s3.us-east-2.amazonaws.com/390f48af-0522-4c82-b03c-a9aad294b7db_zeytech?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQAAEPLJFM5T2QSTI%2F20201103%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20201103T115412Z&X-Amz-Expires=28800&X-Amz-Signature=cdb4ba2cd7040614d7b5e88a582ea25306bddf61d1478270c08867643ffa9320&X-Amz-SignedHeaders=host"
// __proto__: Object
// modified: 1604404452113
// row_type: "upload"
// session_id: "2b52e404-efa3-400f-85df-da663af35b71"
// status: "UPLOADING"
// unique_id:
