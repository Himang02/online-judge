const { Worker } = require('bullmq');
const { runCode } = require('./executor');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const worker = new Worker('submissions', async (job) => {
    const { submissionId, code, language, testCases, timeLimit, memoryLimit } = job.data;

    console.log(`Processing submission ${submissionId}`);

    const verdict = await runCode(submissionId, code, language, testCases, timeLimit, memoryLimit);

    console.log(`Submission ${submissionId} verdict: ${verdict}`);

    return { submissionId, verdict };
}, {
    connection,
    concurrency: 3,
});

worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with verdict: ${result.verdict}`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});

module.exports = worker;
