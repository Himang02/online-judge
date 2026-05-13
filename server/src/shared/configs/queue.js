const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
};

const submissionQueue = new Queue('submissions', { connection });

module.exports = { submissionQueue, connection };
