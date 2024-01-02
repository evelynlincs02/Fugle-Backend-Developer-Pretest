const WebSocket = require('ws');

let bitstampWS;

const setupServer = (server) => {
  serverWS = new WebSocket.Server({ server: server, path: "/streaming" });
  serverWS.on('connection', ws => {
    if (!bitstampWS) {
      bitstampWS = initBitStampWS(ws);
    }
    console.log('Open connection');

    ws.on('close', () => {
      console.log('Close connected')
    });

    ws.on('message', evt => {
      let response = JSON.parse(evt.data);
      switch (response.event) {
        case 'subscribe': {
          let currencyPair = response.data.currency_pair;
          let msg = {
            "event": "bts:subscribe",
            "data": {
              "channel": `live_trades_${currencyPair}`
            }
          };
          bitstampWS.send(JSON.stringify(msg));
          break;
        }
        case 'unsubscribe': {
          let currencyPair = response.data.currency_pair;
          let msg = {
            "event": "bts:unsubscribe",
            "data": {
              "channel": `live_trades_${currencyPair}`
            }
          };
          bitstampWS.send(JSON.stringify(msg));
          break;
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
        serverWS.send(JSON.stringify(response.data));
        break;
      }
      case 'bts:request_reconnect': {
        initBitStampWS();
        break;
      }
    }

  };
  /**
   * In case of unexpected close event, try to reconnect.
   */
  bitstampWS.onclose = function () {
    console.log('Websocket connection closed');
    initBitStampWS();
  };

  return bitstampWS;
}

module.exports = setupServer