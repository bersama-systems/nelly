// server.js
const express = require('express');

const app = express();
const port = 3000;

var examples = [
  {
    name: 'Joshua Teitelbaum',
    project: 'nelly',
    id: 0
  },
  {
    name: "Dan Holliman",
    project: 'nelly',
    id: 1
  }
]

app.get('/api/example', (req, res) => {
  res.status(200).json(examples)
});

app.get('/api/example/:id', (req, res) => {
  res.status(200).json(examples.filter((example) => example.id == req.params.id))
});

app.put('/api/example/object/:id', (req, res) => {
  res.send('Hello from the PUT example object API endpoint!', 200);
});

app.post('/api/example/object', (req, res) => {
  res.status = 200;
  res.send('Hello from the POST example API endpoint!');
});

app.post('/api/example/object/:id/subobject', (req, res) => {
  res.status = 200;
  res.send('Hello from the POST example sub object API endpoint!', 200);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

