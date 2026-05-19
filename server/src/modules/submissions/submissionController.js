const submissionService = require('./submissionService');
const sseManager = require('../../shared/utils/sseManager');

async function createSubmission(req, res, next) {
    const { problemId, code, language } = req.body;
    const userId = req.user.id;

    try {
        const submission = await submissionService.createSubmission({ userId, problemId, code, language });
        return res.status(202).json({ submission });
    } catch (err) {
        next(err);
    }
}

async function getSubmissionById(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const submission = await submissionService.getSubmissionById(id, userId);
        return res.status(200).json({ submission });
    } catch (err) {
        next(err);
    }
}

async function getUserSubmissions(req, res, next) {
    const userId = req.user.id;

    try {
        const submissions = await submissionService.getUserSubmissions(userId);
        return res.status(200).json({ submissions });
    } catch (err) {
        next(err);
    }
}

async function getUserSubmissionsForProblem(req, res, next) {
    const { problemId } = req.params;
    const userId = req.user.id;

    try {
        const submissions = await submissionService.getUserSubmissionsForProblem(userId, problemId);
        return res.status(200).json({ submissions });
    } catch (err) {
        next(err);
    }
}

async function streamVerdict(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    // Ownership check before committing to SSE — can still return normal HTTP errors here
    try {
        await submissionService.getSubmissionById(id, userId);
    } catch (err) {
        return next(err);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Register FIRST, then re-check — closes the race condition window
    sseManager.subscribe(id, res);
    req.on('close', () => sseManager.unsubscribe(id));

    // Re-check verdict after registering — handles case where execution finished
    // before client opened the SSE connection
    try {
        const submission = await submissionService.getSubmissionById(id, userId);
        if (submission.verdict !== 'PENDING') {
            sseManager.notify(id, submission.verdict);
        }
    } catch (err) {
        sseManager.unsubscribe(id);
        res.end();
    }
}

module.exports = {
    createSubmission,
    getSubmissionById,
    getUserSubmissions,
    getUserSubmissionsForProblem,
    streamVerdict,
};
