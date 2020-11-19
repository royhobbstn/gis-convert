import React, { useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from 'semantic-ui-react';
import uuid from 'uuid/v4';

export function UploadControl({ updateData, clearSessionButton }) {
  const fileUpload = useRef(null);

  useEffect(() => {
    async function fetchDynamoData() {
      const token = window.localStorage.getItem('sessionId');
      let response;
      try {
        response = await axios.post(`/data`, { token });
        updateData(response.data.sessionData.Items);
      } catch (err) {
        console.error(err);
        alert('Unable to fetch data from the server.');
      }
    }
    fetchDynamoData();
  }, [updateData]);

  function clearSession() {
    window.localStorage.setItem('sessionId', uuid());
    updateData([]);
  }

  function chooseFile(evt) {
    let file = evt.target.files[0];
    if (!file || !file.name) {
      return false;
    }
    if (file.size > 50e6) {
      alert('File exceeds 50 MB limit.');
      return false;
    }

    const token = window.localStorage.getItem('sessionId');
    const formData = new FormData();
    formData.append('file', evt.target.files[0]);
    formData.append('token', token);
    axios
      .put(`/upload-file`, formData, {
        headers: { 'content-type': 'multipart/form-data' },
      })
      .then(response => {
        updateData(response.data.sessionData.Items);
      })
      .catch(err => {
        console.error(err);
        alert('Unable to upload file!');
      });
  }

  return (
    <div style={{ margin: '20px 0 10px 0' }}>
      <div
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '30px',
          marginBottom: '20px',
          textAlign: 'center',
          display: 'block',
        }}
      >
        <Button
          primary
          content="Choose File to Upload"
          labelPosition="left"
          icon="file"
          onClick={() => fileUpload.current.click()}
        />
        {clearSessionButton ? (
          <Button
            style={{ marginLeft: '30px' }}
            content="Clear Session"
            onClick={() => clearSession()}
          />
        ) : null}
      </div>
      <input ref={fileUpload} type="file" hidden onChange={chooseFile} />
    </div>
  );
}
