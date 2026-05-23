const express = require('express');
const router = express.Router();

const authMiddleware = require('../../shared/middlewares/authMiddleware');
const requireRole = require('../../shared/middlewares/roleMiddleware');
const tagController = require('./tagController');
const { createTagValidators } = require('./tagValidator');

router.get('/', tagController.getTags);
router.post('/', authMiddleware, requireRole('PROBLEM_SETTER'), createTagValidators, tagController.createTag);
router.delete('/:id', authMiddleware, requireRole('PROBLEM_SETTER'), tagController.deleteTag);

module.exports = router;
