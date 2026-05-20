const express = require('express');
const router = express.Router();

const authMiddleware = require('../../shared/middlewares/authMiddleware');
const submissionController = require('./submissionController');
const { createSubmissionValidators } = require('./submissionValidator');

router.use(authMiddleware);

router.post('/', createSubmissionValidators, submissionController.createSubmission);
router.get('/', submissionController.getUserSubmissions);
router.get('/problem/:problemId', submissionController.getUserSubmissionsForProblem);
router.get('/:id', submissionController.getSubmissionById);
router.get('/:id/events', submissionController.streamVerdict);

module.exports = router;
