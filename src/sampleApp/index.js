// server.js
const express = require('express');

const app = express();
const port = 3000;

app.get('/api/example', (req, res) => {
  res.send('Hello from the GET example API endpoint!');
});

app.get('/api/example/:id', (req, res) => {
  res.send('Hello from the GET WITH ID example API endpoint!: ', req.params.id);
});

app.put('/api/example/object/:id', (req, res) => {
  res.send('Hello from the PUT example object API endpoint!', req.params.id);
});

app.post('/api/example/object', (req, res) => {
  res.send('Hello from the POST example API endpoint!');
});

app.post('/api/example/object/:id/subobject', (req, res) => {
  res.send('Hello from the POST example sub object API endpoint!', req.params.id);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

