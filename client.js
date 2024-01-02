const WebSocket = require('ws')

let ws = new WebSocket('ws://localhost:3000/streaming')

ws.onopen = () => {
  console.log('client: open connection')
}

ws.onclose = () => {
  console.log('client: close connection')
}

let count = 0
ws.onmessage = (evt) => {
  let response = JSON.parse(evt.data);
  console.log(response)
  count++

  if (count == 3) {
    let subscribeMsg = {
      "event": "subscribe",
      "data": {
        "currency_pair": "btceur"
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
  }

  if (count == 5) {
    let subscribeMsg = {
      "event": "unsubscribe",
      "data": {
        "currency_pair": "btcusd"
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
  }

  if (count%7 == 0) {
    let subscribeMsg = {
      "event": "subscribe_list",
    };
    ws.send(JSON.stringify(subscribeMsg));
  }
}