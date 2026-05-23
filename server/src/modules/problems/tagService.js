const prismaClient = require('../../shared/configs/db');
const AppError = require('../../shared/utils/AppError');

async function getTags() {
    return prismaClient.tag.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });
}

async function createTag(name) {
    const normalized = name.toLowerCase().trim();

    const existing = await prismaClient.tag.findUnique({
        where: { name: normalized },
    });

    if (existing) {
        throw new AppError(`Tag "${normalized}" already exists`, 409);
    }

    return prismaClient.tag.create({
        data: { name: normalized },
        select: { id: true, name: true },
    });
}

async function deleteTag(tagId) {
    const tag = await prismaClient.tag.findUnique({
        where: { id: tagId },
    });

    if (!tag) {
        throw new AppError('Tag not found', 404);
    }

    await prismaClient.tag.delete({
        where: { id: tagId },
    });
}

module.exports = {
    getTags,
    createTag,
    deleteTag,
};
