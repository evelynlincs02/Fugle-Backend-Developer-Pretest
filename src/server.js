const express = require('express')
const rateLimiter = require('./middleware')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('# API Server Implementation')
})

app.get('/data', rateLimiter, (req, res) => {
  fetch("https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty")
  .then(response => response.json())
  .then(jsonArray => {
    let id = req.query.user
    let resultArray = []
    jsonArray.forEach(num => {
      if (num%id == 0) {
        resultArray.push(num)
      }
    });

    // res.setHeader('Content-Type', 'application/json');
    res.send({result: resultArray})
  })
  .catch(function (err) {
    res.status(500).send(err.message);
    console.log("Unable to fetch -", err);
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})