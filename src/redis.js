const redis = require('redis');

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


module.exports = redisClient;