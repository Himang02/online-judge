const testCaseService = require('./testCaseService');

async function addTestCase(req, res, next) {
    const { problemId } = req.params;
    const userId = req.user.id;

    try {
        const testCase = await testCaseService.addTestCase(problemId, userId, req.body);
        return res.status(201).json({ testCase });
    } catch (err) {
        next(err);
    }
}

async function updateTestCase(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const testCase = await testCaseService.updateTestCase(id, userId, req.body);
        return res.status(200).json({ testCase });
    } catch (err) {
        next(err);
    }
}

async function deleteTestCase(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        await testCaseService.deleteTestCase(id, userId);
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    addTestCase,
    updateTestCase,
    deleteTestCase,
};
