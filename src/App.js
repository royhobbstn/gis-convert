import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './lib/storage.js';
import { UploadsTable } from './UploadsTable';
import { ProductsTable } from './ProductsTable';
import { UploadControl } from './UploadControl';
import { MenuBar } from './MenuBar';

let heartbeat = null;

function App() {
  const [data, updateData] = useState([]);
  const [uploads, products] = parseData(data);

  useEffect(() => {
    if (statusPending(data)) {
      if (!heartbeat) {
        heartbeat = window.setInterval(async () => {
          const token = window.localStorage.getItem('sessionId');
          let response;
          try {
            response = await axios.post(`/data`, { token });
            updateData(response.data.sessionData.Items);
          } catch (err) {
            // stop sending requests if they error
            if (heartbeat) {
              clearInterval(heartbeat);
              heartbeat = null;
            }
          }
        }, 5000);
      }
    } else {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    }
  }, [data, updateData]);

  return (
    <div className="App">
      <MenuBar />
      {data.length === 0 ? (
        <h1
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingTop: '3%',
            textAlign: 'center',
          }}
        >
          Convert Geo Files
        </h1>
      ) : (
        <div style={{ width: '100%', padding: '6px' }}></div>
      )}
      <UploadControl updateData={updateData} />
      {uploads.length > 0 ? <UploadsTable data={uploads} updateData={updateData} /> : null}
      {products.length > 0 ? <ProductsTable data={products} updateData={updateData} /> : null}
    </div>
  );
}

export default App;

function parseData(data) {
  const sortedData = [...data].sort((a, b) => {
    return b.created - a.created;
  });

  const uploads = [];
  const products = [];

  for (let item of sortedData) {
    if (item.row_type === 'upload') {
      uploads.push(item);
    } else if (item.row_type === 'product') {
      products.push(item);
    } else {
      console.error('unexpected row_type');
    }
  }

  return [uploads, products];
}

function statusPending(data) {
  for (let row of data) {
    if (row.status !== 'READY' && row.status !== 'ERROR') {
      return true;
    }
  }
  return false;
}
