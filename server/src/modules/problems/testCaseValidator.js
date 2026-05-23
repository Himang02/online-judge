const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const addTestCaseValidation = [
    body('input')
        .notEmpty().withMessage('Input is required'),

    body('expectedOutput')
        .notEmpty().withMessage('Expected output is required'),

    body('isSample')
        .optional()
        .isBoolean().withMessage('isSample must be a boolean'),
];

const updateTestCaseValidation = [
    body('input')
        .optional()
        .notEmpty().withMessage('Input cannot be empty'),

    body('expectedOutput')
        .optional()
        .notEmpty().withMessage('Expected output cannot be empty'),

    body('isSample')
        .optional()
        .isBoolean().withMessage('isSample must be a boolean'),
];

module.exports = {
    addTestCaseValidators: [...addTestCaseValidation, validate],
    updateTestCaseValidators: [...updateTestCaseValidation, validate],
};
