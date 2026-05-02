const prismaClient = require('../../shared/configs/db');
const AppError = require('../../shared/utils/AppError');
const { submissionQueue } = require('../../shared/configs/queue');

async function createSubmission(data) {
    const { userId, problemId, code, language } = data;

    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
        include: { testCases: true },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.status !== 'PUBLISHED') {
        throw new AppError('Problem not found', 404);
    }

    if (problem.testCases.length === 0) {
        throw new AppError('Problem has no test cases', 400);
    }

    const submission = await prismaClient.submission.create({
        data: {
            userId,
            problemId,
            code,
            language,
        },
    });

    await submissionQueue.add('judge', {
        submissionId: submission.id,
        code,
        language,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        testCases: problem.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
        })),
    });

    return submission;
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
