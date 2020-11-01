import React, { useRef } from 'react';
import axios from 'axios';
import { Button } from 'semantic-ui-react';

import './App.css';

function App() {
  const fileUpload = useRef(null);

  function chooseFile(evt) {
    let file = evt.target.files[0];
    console.log(file);
    if (!file || !file.name) {
      window.alert('Please select a file');
      return false;
    }
    if (file.size > 10e6) {
      window.alert('Please upload a file smaller than 10 MB');
      return false;
    }

    const formData = new FormData();
    formData.append('file', evt.target.files[0]);
    axios
      .put('/upload-file', formData, { headers: { 'content-type': 'multipart/form-data' } })
      .then(data => {
        console.log('file uploaded');
        console.log(data);
      })
      .catch(e => {
        console.log('error');
        console.log(e);
      });
  }

  return (
    <div className="App">
      <Button
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '10%',
          width: '220px',
          display: 'block',
        }}
        primary
        content="Choose File to Upload"
        labelPosition="left"
        icon="file"
        onClick={() => fileUpload.current.click()}
      />
      <input ref={fileUpload} type="file" hidden onChange={chooseFile} />
    </div>
  );
}

export default App;
