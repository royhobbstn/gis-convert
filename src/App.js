import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './lib/storage.js';
import { UploadsTable } from './UploadsTable';
import { ProductsTable } from './ProductsTable';
import { UploadControl } from './UploadControl';

let heartbeat = null;

function App() {
  const [data, updateData] = useState([]);
  const [uploads, products] = parseData(data);

  useEffect(() => {
    if (statusPending(data)) {
      console.log('pending');
      if (!heartbeat) {
        console.log('doesnt exist');
        heartbeat = window.setInterval(async () => {
          console.log('calling');
          const token = window.localStorage.getItem('sessionId');
          let response;
          try {
            response = await axios.post(`/data`, { token });
            updateData(response.data.sessionData.Items);
          } catch (err) {
            console.error(err);
            // stop sending requests if they error
            if (heartbeat) {
              clearInterval(heartbeat);
            }
          }
        }, 5000);
      }
    } else {
      console.log('not pending');
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    }
  }, [data, updateData]);

  return (
    <div className="App">
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
  console.log(data);
  for (let row of data) {
    console.log(row.status);
    if (row.status !== 'READY' && row.status !== 'ERROR') {
      return true;
    }
  }
  return false;
}
