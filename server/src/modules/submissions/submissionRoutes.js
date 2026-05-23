const express = require('express');
const router = express.Router();

const authMiddleware = require('../../shared/middlewares/authMiddleware');
const submissionController = require('./submissionController');
const { createSubmissionValidators } = require('./submissionValidator');
const aiController = require('../ai/aiController');
const aiReviewRateLimit = require('../ai/aiRateLimit');

router.use(authMiddleware);

router.post('/', createSubmissionValidators, submissionController.createSubmission);
router.get('/', submissionController.getUserSubmissions);
router.get('/problem/:problemId', submissionController.getUserSubmissionsForProblem);
router.get('/:id/events', submissionController.streamVerdict);
router.get('/:id/ai-review', aiReviewRateLimit, aiController.getAIReview);
router.get('/:id', submissionController.getSubmissionById);

module.exports = router;
