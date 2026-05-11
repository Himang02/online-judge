const { Worker } = require('bullmq');
const { runCode } = require('./executor');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker('submissions', async (job) => {
    const { submissionId, code, language, testCases, timeLimit, memoryLimit } = job.data;
    const verdict = await runCode(submissionId, code, language, testCases, timeLimit, memoryLimit);
    return { submissionId, verdict };
}, {
    connection,
    concurrency: 3,
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});

module.exports = worker;
