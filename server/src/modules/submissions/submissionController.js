const submissionService = require('./submissionService');

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

module.exports = {
    createSubmission,
    getSubmissionById,
    getUserSubmissions,
    getUserSubmissionsForProblem,
};
