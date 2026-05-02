const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const createSubmissionValidation = [
    body('problemId')
        .trim()
        .notEmpty().withMessage('Problem ID is required'),

    body('code')
        .notEmpty().withMessage('Code is required'),

    body('language')
        .notEmpty().withMessage('Language is required').bail()
        .isIn(['C', 'CPP', 'JAVA', 'PYTHON']).withMessage('Language must be C, CPP, JAVA, or PYTHON'),
];

module.exports = {
    createSubmissionValidators: [...createSubmissionValidation, validate],
};
