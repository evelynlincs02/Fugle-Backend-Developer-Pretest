const redis = require('redis');
const TimeSeriesDuplicatePolicies = require('@redis/time-series').TimeSeriesDuplicatePolicies
const TimeSeriesEncoding = require('@redis/time-series').TimeSeriesEncoding

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
      DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.BLOCK, // No duplicates - When not specified: set to the global DUPLICATE_POLICY configuration of the database (which by default, is BLOCK).
    });

    if (created === 'OK') {
      console.log('redis: Created timeseries. key=', key);
    } else {
      console.log('redis: Error creating timeseries :(');
      process.exit(1);
    }
  }
};

module.exports = createRedisTS;