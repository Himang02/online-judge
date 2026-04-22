const { body, validationResult } = require("express-validator");

const registerValidation = [
    // Name: 2–100 chars, not empty
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required").bail()
        .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),

    // Username: alphanumeric + underscore, no spaces, length constraint
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required").bail()
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be between 3 and 30 characters").bail()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers, and underscores"),

    // Email: valid format
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required").bail()
        .isEmail().withMessage("Invalid email format")
        .normalizeEmail(),

    // Password: 8–72 chars (bcrypt safe range)
    body("password")
        .notEmpty().withMessage("Password is required").bail()
        .isLength({ min: 8, max: 72 })
        .withMessage("Password must be between 8 and 72 characters"),

];

const loginValidation = [
    // Email: valid format
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required").bail()
        .isEmail().withMessage("Invalid email format")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required")

];

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }

    next();
};

const registerValidators = [...registerValidation, validate];
const loginValidators = [...loginValidation, validate];

module.exports = {
    registerValidators,
    loginValidators
};