import React, { useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from 'semantic-ui-react';

export function UploadControl({ updateUploads, updateProducts }) {
  const fileUpload = useRef(null);

  useEffect(() => {
    async function fetchDynamoData() {
      const token = window.localStorage.getItem('sessionId');
      const response = await axios.get(`/data?token=${token}`);
      updateUploads(response.data.sessionData.Items);
    }
    fetchDynamoData();
  }, [updateUploads]);

  function chooseFile(evt) {
    let file = evt.target.files[0];
    if (!file || !file.name) {
      return false;
    }
    if (file.size > 10e6) {
      window.alert('File exceeds 10 MB limit.');
      return false;
    }

    const formData = new FormData();
    formData.append('file', evt.target.files[0]);
    const token = window.localStorage.getItem('sessionId');
    axios
      .put(`/upload-file?token=${token}`, formData, {
        headers: { 'content-type': 'multipart/form-data' },
      })
      .then(response => {
        console.log(response);
        // response is all records with current sessionId
        updateUploads(response.data.sessionData.Items);
        initiateHeartbeat();
      })
      .catch(e => {
        // send an error record to dynamo?

        console.log('error');
        console.log(e);
        alert('Unable to upload file!');
      });
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <Button
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '4%',
          marginBottom: '4%',
          textAlign: 'center',
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

function initiateHeartbeat() {
  // if heartbeat already happening, return
  // if not, start setInterval.
  // -- in heartbeat dynamo call to fetch all data for session ID
  // -- if all data either in ERROR or DONE state, clear timeout
}
