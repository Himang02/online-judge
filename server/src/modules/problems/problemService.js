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

    const [prev, next] = await Promise.all([
        prismaClient.problem.findFirst({
            where: { status: 'PUBLISHED', createdAt: { lt: problem.createdAt } },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        }),
        prismaClient.problem.findFirst({
            where: { status: 'PUBLISHED', createdAt: { gt: problem.createdAt } },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        }),
    ]);

    return { ...problem, prevId: prev?.id ?? null, nextId: next?.id ?? null };
}

async function getProblems({ tags, difficulty, search, page = 1, limit = 20 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;

    const where = {
        status: 'PUBLISHED',
        ...(difficulty && { difficulty }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
        ...(tags && tags.length > 0 && {
            tags: { some: { name: { in: tags } } },
        }),
    };

    const [problems, total] = await Promise.all([
        prismaClient.problem.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                title: true,
                difficulty: true,
                tags: { select: { id: true, name: true } },
            },
        }),
        prismaClient.problem.count({ where }),
    ]);

    const problemIds = problems.map((p) => p.id);

    const [acCounts, totalCounts] = await Promise.all([
        prismaClient.submission.groupBy({
            by: ['problemId'],
            where: { problemId: { in: problemIds }, verdict: 'AC' },
            _count: { id: true },
        }),
        prismaClient.submission.groupBy({
            by: ['problemId'],
            where: { problemId: { in: problemIds } },
            _count: { id: true },
        }),
    ]);

    const acMap = new Map(acCounts.map((r) => [r.problemId, r._count.id]));
    const totalMap = new Map(totalCounts.map((r) => [r.problemId, r._count.id]));

    const result = problems.map((p) => {
        const t = totalMap.get(p.id) ?? 0;
        return {
            ...p,
            acceptanceRate: t > 0 ? Math.round(((acMap.get(p.id) ?? 0) / t) * 100) : null,
        };
    });

    return { problems: result, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}



async function createProblem(data) {
    const { title, description, inputFormat, outputFormat, constraints, difficulty, createdBy, tagIds = [] } = data;
    const timeLimit = data.timeLimit !== undefined ? parseInt(data.timeLimit, 10) : undefined;
    const memoryLimit = data.memoryLimit !== undefined ? parseInt(data.memoryLimit, 10) : undefined;

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
            ...(inputFormat !== undefined && { inputFormat }),
            ...(outputFormat !== undefined && { outputFormat }),
            ...(constraints !== undefined && { constraints }),
            difficulty,
            ...(timeLimit !== undefined && { timeLimit }),
            ...(memoryLimit !== undefined && { memoryLimit }),
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

    const { title, description, inputFormat, outputFormat, constraints, difficulty, timeLimit, memoryLimit, tagIds } = data;

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
            ...(inputFormat !== undefined && { inputFormat }),
            ...(outputFormat !== undefined && { outputFormat }),
            ...(constraints !== undefined && { constraints }),
            ...(difficulty !== undefined && { difficulty }),
            ...(timeLimit !== undefined && { timeLimit }),
            ...(memoryLimit !== undefined && { memoryLimit }),
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