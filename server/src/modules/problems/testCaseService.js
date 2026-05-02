const prismaClient = require('../../shared/configs/db');
const AppError = require('../../shared/utils/AppError');

async function addTestCase(problemId, userId, data) {
    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    const { input, expectedOutput, isSample = false } = data;

    return prismaClient.testCase.create({
        data: {
            problemId,
            input,
            expectedOutput,
            isSample,
        },
    });
}

async function updateTestCase(testCaseId, userId, data) {
    const testCase = await prismaClient.testCase.findUnique({
        where: { id: testCaseId },
        include: { problem: { select: { createdBy: true } } },
    });

    if (!testCase) {
        throw new AppError('Test case not found', 404);
    }

    if (testCase.problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    const { input, expectedOutput, isSample } = data;

    return prismaClient.testCase.update({
        where: { id: testCaseId },
        data: {
            ...(input !== undefined && { input }),
            ...(expectedOutput !== undefined && { expectedOutput }),
            ...(isSample !== undefined && { isSample }),
        },
    });
}

async function deleteTestCase(testCaseId, userId) {
    const testCase = await prismaClient.testCase.findUnique({
        where: { id: testCaseId },
        include: { problem: { select: { createdBy: true } } },
    });

    if (!testCase) {
        throw new AppError('Test case not found', 404);
    }

    if (testCase.problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    await prismaClient.testCase.delete({
        where: { id: testCaseId },
    });
}

module.exports = {
    addTestCase,
    updateTestCase,
    deleteTestCase,
};
