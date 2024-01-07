const redis = require('redis');
const TimeSeriesDuplicatePolicies = require('@redis/time-series').TimeSeriesDuplicatePolicies
const TimeSeriesEncoding = require('@redis/time-series').TimeSeriesEncoding
const TimeSeriesAggregationType = require('@redis/time-series').TimeSeriesAggregationType

const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST || "172.17.0.3",
  PORT: process.env.REDIS_PORT || "6379"
};

let redisClient;

(async () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      socket: {
        host: REDIS_CONFIG.HOST,
        port: REDIS_CONFIG.PORT
      },
    });

    await redisClient.connect();
  }
})();

async function createRedisTS(key) {
  const exist = await redisClient.exists(key);

  if (!exist) {
    const created = await redisClient.ts.create(key, {
      RETENTION: 1000 * 60 * 15, // 15 minutes in milliseconds
      ENCODING: TimeSeriesEncoding.UNCOMPRESSED, // No compression - When not specified, the option is set to COMPRESSED
      DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.FIRST, // No duplicates - When not specified: set to the global DUPLICATE_POLICY configuration of the database (which by default, is BLOCK).
    });

    if (created === 'OK') {
      console.log('redis: Created timeseries. key=', key);
    } else {
      console.log('redis: Error creating timeseries :(');
      process.exit(1);
    }
  }
};

async function addRedisTS(key, timeStamp, value) {
  await redisClient.ts.add(key, timeStamp, value);
}

async function getOHLC(key, fromTimestamp, toTimestamp) {
  const rangeResponseCount = await redisClient.ts.range(key, fromTimestamp, toTimestamp, {
    AGGREGATION: {
      type: TimeSeriesAggregationType.COUNT,
      timeBucket: 60 * 1000
    }
  });

  if (rangeResponseCount.length > 0) {
    const rangeResponseO = await redisClient.ts.range(key, fromTimestamp, toTimestamp, {
      AGGREGATION: {
        type: TimeSeriesAggregationType.FIRST,
        timeBucket: 60 * 1000
      }
    });
    const rangeResponseH = await redisClient.ts.range(key, fromTimestamp, toTimestamp, {
      AGGREGATION: {
        type: TimeSeriesAggregationType.MAX,
        timeBucket: 60 * 1000
      }
    });
    const rangeResponseL = await redisClient.ts.range(key, fromTimestamp, toTimestamp, {
      AGGREGATION: {
        type: TimeSeriesAggregationType.MIN,
        timeBucket: 60 * 1000
      }
    });
    const rangeResponseC = await redisClient.ts.range(key, fromTimestamp, toTimestamp, {
      AGGREGATION: {
        type: TimeSeriesAggregationType.LAST,
        timeBucket: 60 * 1000
      }
    });

    return {
      "open": rangeResponseO[0].value,
      "high": rangeResponseH[0].value,
      "low": rangeResponseL[0].value,
      "close": rangeResponseC[0].value,
    };
  } else {
    return "empty"
  }
}

module.exports = { redisClient, createRedisTS, addRedisTS, getOHLC };