import React, { useState } from 'react';
import './lib/storage.js';
import { UploadsTable } from './UploadsTable';
import { ProductsTable } from './ProductsTable';
import { UploadControl } from './UploadControl';

function App() {
  const [uploads, updateUploads] = useState([]);
  const [products, updateProducts] = useState([]);

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
      <UploadControl updateUploads={updateUploads} updateProducts={updateProducts} />
      {uploads.length > 0 ? <UploadsTable data={uploads} /> : null}
      {products.length > 0 ? <ProductsTable data={uploads} /> : null}
    </div>
  );
}

export default App;
