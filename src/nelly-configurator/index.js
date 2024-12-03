// server.js
const express = require('express');
const path = require('path')

const app = express();
app.use(express.json());
const port = 3001;

app.get('/api/example', (req, res) => {
  res.status(200).json({data: "hi"})
});

app.use('/static', express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

