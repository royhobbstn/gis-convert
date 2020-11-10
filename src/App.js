import React, { useState } from 'react';
import './lib/storage.js';
import { UploadsTable } from './UploadsTable';
import { ProductsTable } from './ProductsTable';
import { UploadControl } from './UploadControl';

function App() {
  const [data, updateData] = useState([]);

  const [uploads, products] = parseData(data);

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
  console.log({ data });
  const sortedData = [...data].sort((a, b) => {
    return b.created - a.created;
  });

  console.log({ sortedData });

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
