const Redis = require('ioredis');

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    enableOfflineQueue: false,
    lazyConnect: true,
});

module.exports = redisClient;
