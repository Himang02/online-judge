const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const redisClient = require('../configs/redis');

const loginLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'auth_login',
    points: 5,
    duration: 15 * 60, // 5 attempts per 15 minutes per IP
    insuranceLimiter: new RateLimiterMemory({ points: 5, duration: 15 * 60 }),
});

const registerLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'auth_register',
    points: 3,
    duration: 60 * 60, // 3 attempts per hour per IP
    insuranceLimiter: new RateLimiterMemory({ points: 3, duration: 60 * 60 }),
});

function makeLimiterMiddleware(limiter, label) {
    return async function (req, res, next) {
        try {
            await limiter.consume(req.ip);
            next();
        } catch (err) {
            if (err?.msBeforeNext !== undefined) {
                const retryAfterSec = Math.ceil(err.msBeforeNext / 1000);
                console.warn(`[Auth] Rate limit hit on ${label} — ip=${req.ip} retryAfter=${retryAfterSec}s`);
                return res.status(429).json({
                    error: `Too many ${label} attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
                    retryAfterSeconds: retryAfterSec,
                });
            }
            next(err);
        }
    };
}

const loginRateLimit = makeLimiterMiddleware(loginLimiter, 'login');
const registerRateLimit = makeLimiterMiddleware(registerLimiter, 'register');

module.exports = { loginRateLimit, registerRateLimit };
