const WebSocket = require('ws');

const setupServer = (server) => {
  serverWS = new WebSocket.Server({ server: server, path: "/streaming" });
  serverWS.on('connection', ws => {

    let bitstampWS = initBitStampWS(ws);
    let subscribing = ["btcusd"];

    console.log('serverWS: Open connection');

    ws.on('close', () => {
      console.log('serverWS: Close connection')
      bitstampWS.close()
    });

    ws.on('message', evt => {
      let response = JSON.parse(evt);
      console.log("client: ", response);
      switch (response.event) {
        case 'subscribe': {
          let currencyPair = response.data.currency_pair;
          const index = subscribing.indexOf(currencyPair);
          if (subscribing.length < 10 && index == -1) {
            subscribing.push(currencyPair);
            let msg = {
              "event": "bts:subscribe",
              "data": {
                "channel": `live_trades_${currencyPair}`
              }
            };
            bitstampWS.send(JSON.stringify(msg));
          }
          break;
        }
        case 'unsubscribe': {
          let currencyPair = response.data.currency_pair;
          const index = subscribing.indexOf(currencyPair);
          if (index > -1) { // only splice array when item is found
            subscribing.splice(index, 1);
            let msg = {
              "event": "bts:unsubscribe",
              "data": {
                "channel": `live_trades_${currencyPair}`
              }
            };
            bitstampWS.send(JSON.stringify(msg));
          }
          break;
        }
        case 'subscribe_list': {
          let msg = {
            "event": "subscribe_list",
            "data": {
              currency_pair: subscribing
            }
          };

          ws.send(JSON.stringify(msg));
        }
      }
    });
  });

  return serverWS
}


function initBitStampWS(serverWS) {
  bitstampWS = new WebSocket("wss://ws.bitstamp.net");

  bitstampWS.onopen = function () {
    let defaultSubscribeMsg = {
      "event": "bts:subscribe",
      "data": {
        "channel": "live_trades_btcusd"
      }
    };
    bitstampWS.send(JSON.stringify(defaultSubscribeMsg));
  };

  bitstampWS.onmessage = function (evt) {
    let response = JSON.parse(evt.data);
    /**
     * This switch statement handles message logic. It processes data in case of trade event
     * and it reconnects if the server requires.
     */
    switch (response.event) {
      case 'trade': {
        console.log(response.data.id)
        serverWS.send(evt.data);
        break;
      }
      case 'bts:request_reconnect': {
        initBitStampWS();
        break;
      }
    }

  };

  bitstampWS.on("error", (e) => console.error(e));

  bitstampWS.onclose = function () {
    console.log('bitstampWS: Websocket connection closed');
  };

  return bitstampWS;
}

module.exports = setupServer