const express = require('express');
const app = express();
const port = 4000;
const { uploader } = require('./service/uploader');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { createUploadRow, sessionIdQuery } = require('./service/dynamo');

app.put('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const session_id = req.query.token;
    if (!session_id) {
      return res.status(500).json({ error: 'token parameter missing' });
    }
    const responseS3 = await uploader(req.file);
    await createUploadRow({ session_id, responseS3 });
    const sessionData = await sessionIdQuery(session_id);
    return res.status(200).json({ sessionData });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
