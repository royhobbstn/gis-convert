import React, { useRef } from 'react';

import { Button } from 'semantic-ui-react';

import './App.css';

function App() {
  const fileUpload = useRef(null);

  function uploadFile(evt) {
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

      <input ref={fileUpload} type="file" hidden onChange={uploadFile} />
    </div>
  );
}

export default App;
