// server.js
const express = require('express');

const app = express();
const port = 3000;

app.get('/api/example', (req, res) => {
  res.send('Hello from the example API endpoint!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

