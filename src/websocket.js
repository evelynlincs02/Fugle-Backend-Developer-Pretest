const WebSocket = require('ws');
const { redisClient, createRedisTS, addRedisTS, getOHLC } = require('./redis');

function setupServer(server) {
  let serverWS = new WebSocket.Server({ server: server, path: "/streaming" });
  let bitstampWS = initBitStampWS(serverWS);
  const subMap = new Map();

  serverWS.on('connection', ws => {

    // let bitstampWS = initBitStampWS(ws);
    let subscribing = new Set();

    console.log('serverWS: Open connection');

    const jobOHLC = setInterval(function(){
      const zeroSecondTS = new Date().setSeconds(0, 0);
      subscribing.forEach(async market_symbol => {
        let redisKey = `ohlc/${market_symbol}/${Math.floor(zeroSecondTS / 1000)}`;
        let rawData = await redisClient.get(redisKey);
        if (!!rawData) {
          console.log("redis get: ", redisKey);

          ws.send(rawData);
        } else {
          console.log("redis get: ", redisKey, " not found");
          const objOHLC = await getOHLC(market_symbol, zeroSecondTS - 60 * 1000, zeroSecondTS);
          const ohlcData = {
            "event": "ohlc",
            "data": {
              "timestamp": zeroSecondTS / 1000,
              "pair": market_symbol,
              "ohlc": objOHLC
            }
          };

          const rawData = JSON.stringify(ohlcData);
          await redisClient.set(redisKey, rawData, 'EX', 15 * 60);
          ws.send(rawData);
        }
      });
    }, 60 * 1000);

    ws.on('close', () => {
      console.log('serverWS: Close connection');
      subMap.forEach((clientSet, currencyPair) => {
        deleteClient(clientSet, ws, currencyPair);
      });
      clearInterval(jobOHLC);
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
            subscribing.delete(currencyPair);
            const clients = subMap.get(currencyPair);
            if (!!clients) {
              deleteClient(clients, ws, currencyPair);
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
    const tradeDetail = JSON.parse(evt);
    // console.log(tradeDetail);
    const currencyPair = tradeDetail.channel.split('_')[2];
    const wsClients = subMap.get(currencyPair);
    if (!!wsClients) {
      wsClients.forEach(client => {
        client.send(evt);
      });
    }

    addRedisTS(currencyPair, Number(tradeDetail.data.microtimestamp.slice(0, -3)), tradeDetail.data.price);
  });

  function deleteClient(clientSet, ws, currencyPair) {
    clientSet.delete(ws);
    if (clientSet.size == 0) { // No more client subscribing this currencyPair
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