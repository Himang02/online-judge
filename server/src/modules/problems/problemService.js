const prismaClient = require('../../shared/configs/db');
const AppError = require('../../shared/utils/AppError');

async function getProblemById(id, userId) {
    const problem = await prismaClient.problem.findUnique({
        where: { id },
        include: {
            tags: true,
            testCases: {
                where: { isSample: true },
            },
        },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.status === 'DRAFT' && problem.createdBy !== userId) {
        throw new AppError('Problem not found', 404);
    }

    return problem;
}

async function getProblems(tags) {
    const problems = await prismaClient.problem.findMany({
        where: {
            status: 'PUBLISHED',
            ...(tags && tags.length > 0 && {
                tags: {
                    some: {
                        name: { in: tags },
                    },
                },
            }),
        },
        select: {
            id: true,
            title: true,
            difficulty: true,
            tags: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return problems;
}



async function createProblem(data) {
    const { title, description, difficulty, createdBy, tagIds = [] } = data;

    const titleTaken = await isProblemTitleTaken(title);
    if (titleTaken) {
        throw new AppError(`Problem with title "${title}" already exists`, 409);
    }

    if (tagIds.length > 0) {
        const existingTags = await prismaClient.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true },
        });

        if (existingTags.length !== tagIds.length) {
            throw new AppError('One or more tags not found', 400);
        }
    }

    return prismaClient.problem.create({
        data: {
            title,
            description,
            difficulty,
            createdBy,
            tags: {
                connect: tagIds.map((id) => ({ id })),
            },
        },
        include: {
            tags: true,
        },
    });
}

async function updateProblem(problemId, userId, data) {
    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    const { title, description, difficulty, tagIds } = data;

    if (tagIds && tagIds.length > 0) {
        const existingTags = await prismaClient.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true },
        });

        if (existingTags.length !== tagIds.length) {
            throw new AppError('One or more tags not found', 400);
        }
    }

    const updated = await prismaClient.problem.update({
        where: { id: problemId },
        data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(difficulty !== undefined && { difficulty }),
            ...(tagIds !== undefined && tagIds.length > 0 && { tags: { set: tagIds.map((id) => ({ id })) } }),
        },
        include: {
            tags: true,
            testCases: true,
        },
    });

    return updated;
}

async function deleteProblem(problemId, userId) {
    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    await prismaClient.problem.delete({
        where: { id: problemId },
    });
}

async function publishProblem(problemId, userId) {
    const problem = await prismaClient.problem.findUnique({
        where: { id: problemId },
        include: { testCases: { select: { id: true } } },
    });

    if (!problem) {
        throw new AppError('Problem not found', 404);
    }

    if (problem.createdBy !== userId) {
        throw new AppError('Forbidden', 403);
    }

    if (problem.testCases.length === 0) {
        throw new AppError('Cannot publish a problem with no test cases', 400);
    }

    return prismaClient.problem.update({
        where: { id: problemId },
        data: { status: 'PUBLISHED' },
        include: { tags: true },
    });
}

async function isProblemTitleTaken(title) {
    const problem = await prismaClient.problem.findUnique({
        where: { title },
        select: { id: true },
    });

    return problem !== null;
}

module.exports = {
    getProblemById,
    getProblems,
    createProblem,
    updateProblem,
    deleteProblem,
    publishProblem,
}