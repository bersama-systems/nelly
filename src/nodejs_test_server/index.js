// server.js
const express = require('express');

const app = express();
app.use(express.json());
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

app.put('/api/example/:id', (req, res) => {
  target = examples.filter((example) => example.id == req.params.id)
  if(!target) {
    res.status(404).json("Not found")
    return
  }
  if(req.body.project) {
    target.project = req.body.project
    res.status(200).json(target)
    return
  }
  res.status(400).json("Invalid update requested")
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

