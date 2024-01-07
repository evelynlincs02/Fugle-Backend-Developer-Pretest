const WebSocket = require('ws')

let ws = new WebSocket('ws://localhost:3000/streaming')

ws.onopen = () => {
  console.log('client: open connection')
  let subscribeMsg = {
    "event": "subscribe",
    "data": {
      "currency_pair": ["btcusd", "xlmeur", "audiousd", "usdteur"]
    }
  };
  ws.send(JSON.stringify(subscribeMsg));
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
        // "currency_pair": ["btcgbp", "etheur", "bchbtc", "eurusd", "xlmeur", "audiousd", "usdteur", "sxpusd", "1inchusd", "eurcveur"]
        "currency_pair": ["btcgbp", "etheur", "bchbtc"]
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
  }

  if (count == 100) {
    let subscribeMsg = {
      "event": "unsubscribe",
      "data": {
        "currency_pair": ["btcusd", "btcgbp"]
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
    count = 0
  }

  // if (count%5 == 0) {
  //   let subscribeMsg = {
  //     "event": "subscribe_list",
  //   };
  //   ws.send(JSON.stringify(subscribeMsg));
  // }
}