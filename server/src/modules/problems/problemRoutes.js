const express = require('express');
const router = express.Router();

const authMiddleware = require('../../shared/middlewares/authMiddleware');
const requireRole = require('../../shared/middlewares/roleMiddleware');
const problemController = require('./problemController');
const tagController = require('./tagController');
const testCaseController = require('./testCaseController');
const { createProblemValidators, updateProblemValidators } = require('./problemValidator');
const { createTagValidators } = require('./tagValidator');
const { addTestCaseValidators, updateTestCaseValidators } = require('./testCaseValidator');

// Problem routes
router.get('/', problemController.getProblems);
router.get('/:id', problemController.getProblemById);
router.post('/', authMiddleware, requireRole('PROBLEM_SETTER'), createProblemValidators, problemController.createProblem);
router.put('/:id', authMiddleware, requireRole('PROBLEM_SETTER'), updateProblemValidators, problemController.updateProblem);
router.delete('/:id', authMiddleware, requireRole('PROBLEM_SETTER'), problemController.deleteProblem);
router.patch('/:id/publish', authMiddleware, requireRole('PROBLEM_SETTER'), problemController.publishProblem);

// Test case routes
router.post('/:problemId/testcases', authMiddleware, requireRole('PROBLEM_SETTER'), addTestCaseValidators, testCaseController.addTestCase);
router.put('/testcases/:id', authMiddleware, requireRole('PROBLEM_SETTER'), updateTestCaseValidators, testCaseController.updateTestCase);
router.delete('/testcases/:id', authMiddleware, requireRole('PROBLEM_SETTER'), testCaseController.deleteTestCase);

module.exports = router;
