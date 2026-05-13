const { QueueEvents } = require('bullmq');
const { submissionQueue, connection } = require('./queue');
const prismaClient = require('./db');

const queueEvents = new QueueEvents('submissions', { connection });

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
        const { submissionId, verdict } = returnvalue;
        await prismaClient.submission.update({
            where: { id: submissionId },
            data: { verdict },
        });
        console.log(`[QueueEvents] Submission ${submissionId} verdict saved: ${verdict}`);
    } catch (err) {
        console.error(`[QueueEvents] Failed to save verdict for job ${jobId}: ${err.message}`);
    }
});

queueEvents.on('failed', async ({ jobId }) => {
    try {
        const job = await submissionQueue.getJob(jobId);
        if (!job) return;
        const { submissionId } = job.data;
        await prismaClient.submission.update({
            where: { id: submissionId },
            data: { verdict: 'IE' },
        });
        console.log(`[QueueEvents] Submission ${submissionId} marked IE (job failed)`);
    } catch (err) {
        console.error(`[QueueEvents] Failed to mark IE for job ${jobId}: ${err.message}`);
    }
});

module.exports = queueEvents;
