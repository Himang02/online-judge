const prismaClient = require('./db');
const { submissionQueue } = require('./queue');

async function catchUpPendingSubmissions() {
    const pending = await prismaClient.submission.findMany({
        where: { verdict: 'PENDING' },
        select: { id: true },
    });

    if (pending.length === 0) return;

    console.log(`[catchup] ${pending.length} PENDING submission(s) found, checking BullMQ...`);

    const pendingIds = new Set(pending.map((s) => s.id));

    const [completedJobs, failedJobs] = await Promise.all([
        submissionQueue.getJobs(['completed']),
        submissionQueue.getJobs(['failed']),
    ]);

    for (const job of completedJobs) {
        const { submissionId, verdict } = job.returnvalue ?? {};
        if (!submissionId || !pendingIds.has(submissionId)) continue;
        await prismaClient.submission.updateMany({
            where: { id: submissionId, verdict: 'PENDING' },
            data: { verdict },
        });
        console.log(`[catchup] ${submissionId} -> ${verdict}`);
        pendingIds.delete(submissionId);
    }

    for (const job of failedJobs) {
        const { submissionId } = job.data ?? {};
        if (!submissionId || !pendingIds.has(submissionId)) continue;
        await prismaClient.submission.updateMany({
            where: { id: submissionId, verdict: 'PENDING' },
            data: { verdict: 'IE' },
        });
        console.log(`[catchup] ${submissionId} -> IE (job failed)`);
        pendingIds.delete(submissionId);
    }

    if (pendingIds.size > 0) {
        console.log(`[catchup] ${pendingIds.size} submission(s) still PENDING — jobs may still be running`);
    }
}

catchUpPendingSubmissions().catch((err) => {
    console.error('[catchup] Error:', err.message);
});
