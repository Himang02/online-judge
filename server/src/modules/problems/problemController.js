const problemService = require('./problemService');

async function getProblems(req, res, next) {
    const tags = req.query.tag
        ? Array.isArray(req.query.tag) ? req.query.tag : [req.query.tag]
        : [];

    try {
        const problems = await problemService.getProblems(tags);
        return res.status(200).json({ problems });
    } catch (err) {
        next(err);
    }
}

async function getProblemById(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        const problem = await problemService.getProblemById(id, userId);
        return res.status(200).json({ problem });
    } catch (err) {
        next(err);
    }
}

async function createProblem(req, res, next) {
    const { title, description, difficulty, tagIds } = req.body;
    const createdBy = req.user.id;

    try {
        const problem = await problemService.createProblem({ title, description, difficulty, createdBy, tagIds });
        return res.status(201).json({ problem });
    } catch (err) {
        next(err);
    }
}

async function updateProblem(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const problem = await problemService.updateProblem(id, userId, req.body);
        return res.status(200).json({ problem });
    } catch (err) {
        next(err);
    }
}

async function deleteProblem(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        await problemService.deleteProblem(id, userId);
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
}

async function publishProblem(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const problem = await problemService.publishProblem(id, userId);
        return res.status(200).json({ problem });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getProblems,
    getProblemById,
    createProblem,
    updateProblem,
    deleteProblem,
    publishProblem,
};
