const jwtUtil = require('../utils/jwtUtil');
const AppError = require('../utils/AppError');

// Middleware to check token
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        const error = new AppError('No token provided', 401);
        return next(error);
    }

    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
        const error = new AppError('Invalid format', 401);
        return next(error);
    }


    try {
        const decoded = jwtUtil.verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        const error = new AppError('Invalid token', 401);
        return next(error);
    }
}

module.exports = authMiddleware;