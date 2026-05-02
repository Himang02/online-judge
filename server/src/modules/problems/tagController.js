const tagService = require('./tagService');

async function getTags(req, res, next) {
    try {
        const tags = await tagService.getTags();
        return res.status(200).json({ tags });
    } catch (err) {
        next(err);
    }
}

async function createTag(req, res, next) {
    const { name } = req.body;

    try {
        const tag = await tagService.createTag(name);
        return res.status(201).json({ tag });
    } catch (err) {
        next(err);
    }
}

async function deleteTag(req, res, next) {
    const { id } = req.params;

    try {
        await tagService.deleteTag(id);
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTags,
    createTag,
    deleteTag,
};
