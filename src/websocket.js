const WebSocket = require('ws');
const createRedisTS = require('./redis');

function setupServer(server) {
  let serverWS = new WebSocket.Server({ server: server, path: "/streaming" });
  let bitstampWS = initBitStampWS(serverWS);
  const subMap = new Map();

  serverWS.on('connection', ws => {

    // let bitstampWS = initBitStampWS(ws);
    let subscribing = new Set();

    console.log('serverWS: Open connection');

    ws.on('close', () => {
      console.log('serverWS: Close connection');
    });

    ws.on('message', evt => {
      let response = JSON.parse(evt);
      console.log("client: ", response);

      switch (response.event) {
        case 'subscribe': {
          let currencyPairs = new Set(response.data.currency_pair);
          while (currencyPairs.size > 10) {
            const setIter = currencyPairs.keys();
            currencyPairs.delete(setIter.next().value);
          }
          while (subscribing.size + currencyPairs.size > 10) {
            const setIter = subscribing.keys();
            subscribing.delete(setIter.next().value);
          }
          for (const currencyPair of currencyPairs) {
            subscribing.add(currencyPair);
            if (!subMap.has(currencyPair)) {
              createRedisTS(currencyPair);
              subMap.set(currencyPair, new Set([ws]));
              let msg = {
                "event": "bts:subscribe",
                "data": {
                  "channel": `live_trades_${currencyPair}`
                }
              };
              bitstampWS.send(JSON.stringify(msg));
            } else {
              subMap.get(currencyPair).add(ws);
            }
          }
          break;
        }
        case 'unsubscribe': {
          let currencyPairs = response.data.currency_pair;
          for (const currencyPair of currencyPairs) {
            if (subscribing.delete(currencyPair)) {
              const clients = subMap.get(currencyPair);
              if (!!clients) {
                clients.delete(ws);
                if (clients.size == 0) { // No more client subscribing this currencyPair
                  subMap.delete(currencyPair);
                  let msg = {
                    "event": "bts:unsubscribe",
                    "data": {
                      "channel": `live_trades_${currencyPair}`
                    }
                  };
                  bitstampWS.send(JSON.stringify(msg));
                }
              }
            }
          }
          break;
        }
        case 'subscribe_list': {
          let msg = {
            "event": "subscribe_list",
            "data": {
              "currency_pair": Array.from(subscribing)
            }
          };

          ws.send(JSON.stringify(msg));
        }
      }
    });
  });

  serverWS.on('trade', (evt) => {
    const data = JSON.parse(evt);
    console.log(data);
    const currencyPair = data.channel.split('_')[2];
    const wsClients = subMap.get(currencyPair);
    if (!!wsClients) {
      wsClients.forEach(client => {
        client.send(evt);
      });
    }
  });

  return serverWS;
}


function initBitStampWS(serverWS) {
  bitstampWS = new WebSocket("wss://ws.bitstamp.net");

  bitstampWS.onopen = function () {
    // let defaultSubscribeMsg = {
    //   "event": "bts:subscribe",
    //   "data": {
    //     "channel": "live_trades_btcusd"
    //   }
    // };
    // bitstampWS.send(JSON.stringify(defaultSubscribeMsg));
    console.log('bitstampWS: Linked to bitstamp');
  };

  bitstampWS.onmessage = function (evt) {
    let response = JSON.parse(evt.data);
    /**
     * This switch statement handles message logic. It processes data in case of trade event
     * and it reconnects if the server requires.
     */
    switch (response.event) {
      case 'trade': {
        // console.log(response.data.id)
        serverWS.emit('trade', evt.data);
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