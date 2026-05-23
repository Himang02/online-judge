const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const redisClient = require('../../shared/configs/redis');

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'ai_review',
    points: 1,
    duration: 30 * 60, // 1 request per 30 minutes per user
    insuranceLimiter: new RateLimiterMemory({ points: 1, duration: 30 * 60 }),
});

async function aiReviewRateLimit(req, res, next) {
    try {
        await rateLimiter.consume(req.user.id);
        next();
    } catch (err) {
        if (err?.msBeforeNext !== undefined) {
            const retryAfterSec = Math.ceil(err.msBeforeNext / 1000);
            console.warn(`[AI] Rate limit hit — userId=${req.user.id} retryAfter=${retryAfterSec}s`);
            return res.status(429).json({
                error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
                retryAfterSeconds: retryAfterSec,
            });
        }
        next(err);
    }
}

module.exports = aiReviewRateLimit;
