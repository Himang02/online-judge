const AppError = require('../utils/AppError');

function requireRole(...roles) {
    return function (req, res, next) {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('Forbidden', 403));
        }
        next();
    };
}

module.exports = requireRole;
