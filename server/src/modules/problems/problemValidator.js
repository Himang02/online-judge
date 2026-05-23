const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const createProblemValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required').bail()
        .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),

    body('description')
        .trim()
        .notEmpty().withMessage('Description is required'),

    body('difficulty')
        .notEmpty().withMessage('Difficulty is required').bail()
        .isIn(['EASY', 'MEDIUM', 'HARD']).withMessage('Difficulty must be EASY, MEDIUM, or HARD'),

    body('tagIds')
        .optional()
        .isArray().withMessage('tagIds must be an array').bail()
        .custom((arr) => arr.every((id) => typeof id === 'string' && id.trim().length > 0))
        .withMessage('Each tagId must be a non-empty string'),
];

const updateProblemValidation = [
    body('title')
        .optional()
        .trim()
        .notEmpty().withMessage('Title cannot be empty').bail()
        .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),

    body('description')
        .optional()
        .trim()
        .notEmpty().withMessage('Description cannot be empty'),

    body('difficulty')
        .optional()
        .isIn(['EASY', 'MEDIUM', 'HARD']).withMessage('Difficulty must be EASY, MEDIUM, or HARD'),

    body('tagIds')
        .optional()
        .isArray().withMessage('tagIds must be an array').bail()
        .custom((arr) => arr.every((id) => typeof id === 'string' && id.trim().length > 0))
        .withMessage('Each tagId must be a non-empty string'),
];

module.exports = {
    createProblemValidators: [...createProblemValidation, validate],
    updateProblemValidators: [...updateProblemValidation, validate],
};
