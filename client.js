const WebSocket = require('ws')

let ws = new WebSocket('ws://localhost:3000/streaming')

ws.onopen = () => {
  console.log('client: open connection')
}

ws.onclose = () => {
  console.log('client: close connection')
}

ws.onmessage = (evt) => {
  let response = JSON.parse(evt.data);
  console.log(response)
}