const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const createTagValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Tag name is required').bail()
        .isLength({ max: 50 }).withMessage('Tag name must be at most 50 characters'),
];

module.exports = {
    createTagValidators: [...createTagValidation, validate],
};
