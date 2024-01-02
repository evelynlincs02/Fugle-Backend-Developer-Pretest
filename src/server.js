const http = require("http");
const express = require('express');
const rateLimiter = require('./middleware');
const setupWebsocket = require("./websocket");
const app = express();
const port = 3000;

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('# API Server Implementation');
});

app.get('/data', rateLimiter, (req, res) => {
  fetch("https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty")
    .then(response => response.json())
    .then(jsonArray => {
      let id = req.query.user;
      let resultArray = [];
      jsonArray.forEach(num => {
        if (num % id == 0) {
          resultArray.push(num);
        }
      });

      // res.setHeader('Content-Type', 'application/json');
      res.send({ result: resultArray });
    })
    .catch(function (err) {
      res.status(500).send(err.message);
      console.log("Unable to fetch -", err);
    });
})

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

setupWebsocket(server)