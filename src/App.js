import React, { useState } from 'react';
import './lib/storage.js';
import { UploadsTable } from './UploadsTable';
import { ProductsTable } from './ProductsTable';
import { UploadControl } from './UploadControl';

function App() {
  const [uploads, updateUploads] = useState([]);

  return (
    <div className="App">
      <h1
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '8%',
          textAlign: 'center',
        }}
      >
        Convert Geo Files
      </h1>
      <UploadControl updateUploads={updateUploads} />
      <UploadsTable data={uploads} />
      <ProductsTable data={uploads} />
    </div>
  );
}

export default App;
