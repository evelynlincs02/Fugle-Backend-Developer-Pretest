const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/data', (req, res) => {
  res.send(JSON.stringify(req.query))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})