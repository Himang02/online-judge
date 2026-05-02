const prismaClient = require('../../shared/configs/db');
const AppError = require('../../shared/utils/AppError');

async function createSubmission(data) {
    const { userId, problemId, code, language } = data;

    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.status !== 'PUBLISHED') {
        throw new AppError('Problem not found', 404);
    }

    return prismaClient.submission.create({
        data: {
            userId,
            problemId,
            code,
            language,
        },
    });
}

async function getSubmissionById(submissionId, userId) {
    const submission = await prismaClient.submission.findUnique({
        where: { id: submissionId },
    });

    if (!submission) {
        throw new AppError('Submission not found', 404);
    }

    if (submission.userId !== userId) {
        throw new AppError('Forbidden', 403);
    }

    return submission;
}

async function getUserSubmissions(userId) {
    return prismaClient.submission.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            problemId: true,
            language: true,
            verdict: true,
            createdAt: true,
        },
    });
}

async function getUserSubmissionsForProblem(userId, problemId) {
    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    return prismaClient.submission.findMany({
        where: { userId, problemId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            language: true,
            verdict: true,
            createdAt: true,
        },
    });
}

module.exports = {
    createSubmission,
    getSubmissionById,
    getUserSubmissions,
    getUserSubmissionsForProblem,
};
