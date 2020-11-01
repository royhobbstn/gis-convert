const express = require('express');
const app = express();
const port = 3000;
const { uploader } = require('./service/uploader');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/upload-file', upload.single('file'), async (req, res) => {
  const response = await uploader(req.file);
  return res.status(response.statusCode).json(response.body);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
