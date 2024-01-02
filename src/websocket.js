const WebSocket = require('ws');
const redisClient = require('./redis');

const setupServer = (server) => {
  let serverWS = new WebSocket.Server({ server: server, path: "/streaming" });
  serverWS.on('connection', ws => {

    let bitstampWS = initBitStampWS(ws);
    let subscribing = ["btcusd"];

    console.log('serverWS: Open connection');

    const job = setInterval(function () {
      subscribing.forEach(async market_symbol => {
        let redisKey = `ohlc/${market_symbol}/${Math.floor(new Date().setSeconds(0) / 1000)}`;
        let rawData = await redisClient.get(redisKey);
        if (!!rawData) {
          let ohlcData = JSON.parse(rawData);
          console.log("redis get: ", redisKey, ohlcData);
          let msg = {
            "event": "ohlc",
            "pair": ohlcData.pair,
            "data": ohlcData.ohlc
          };

          ws.send(JSON.stringify(msg));
        } else {
          console.log("redis get: ", redisKey, " not found");

          fetch(`https://www.bitstamp.net/api/v2/ohlc/${market_symbol}?step=60&limit=1`)
            .then(response => response.json())
            .then(async ohlcResponse => {
              // console.log(Math.floor(new Date().setSeconds(0)/1000), ohlcResponse.data.ohlc[0].timestamp)
              redisKey = `ohlc/${market_symbol}/${ohlcResponse.data.ohlc[0].timestamp}`

              await redisClient.set(redisKey, JSON.stringify(ohlcResponse.data));
              await redisClient.expire(redisKey, 15 * 60);

              let msg = {
                "event": "ohlc",
                "pair": ohlcResponse.data.pair,
                "data": ohlcResponse.data.ohlc
              };

              ws.send(JSON.stringify(msg));
            })
            .catch(function (err) {
              // res.status(500).send(err.message);
              console.log("Unable to fetch -", err);
            });
        }
      });
    }, 60 * 1000);

    ws.on('close', () => {
      console.log('serverWS: Close connection');
      bitstampWS.close();
      clearInterval(job);
    });

    ws.on('message', evt => {
      let response = JSON.parse(evt);
      console.log("client: ", response);

      switch (response.event) {
        case 'subscribe': {
          let currencyPairs = response.data.currency_pair;
          for (const currencyPair of currencyPairs) {
            const index = subscribing.indexOf(currencyPair);
            if (index == -1) {
              subscribing.push(currencyPair);
              let msg = {
                "event": "bts:subscribe",
                "data": {
                  "channel": `live_trades_${currencyPair}`
                }
              };
              bitstampWS.send(JSON.stringify(msg));
            }
          }

          while (subscribing.length > 10) { // if there are more than 10 currency_pair subscribing, unsubscribe.
            const deleted = subscribing.shift();
            let msg = {
              "event": "bts:unsubscribe",
              "data": {
                "channel": `live_trades_${deleted}`
              }
            };
            bitstampWS.send(JSON.stringify(msg));
          }

          break;
        }
        case 'unsubscribe': {
          let currencyPairs = response.data.currency_pair;
          for (const currencyPair of currencyPairs) {
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
          }
          break;
        }
        case 'subscribe_list': {
          let msg = {
            "event": "subscribe_list",
            "data": {
              "currency_pair": subscribing
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
        // console.log(response.data.id)
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