const { getAICodeReview } = require('./aiService');

async function getAIReview(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const review = await getAICodeReview(id, userId);
        return res.status(200).json(review);
    } catch (err) {
        next(err);
    }
}

module.exports = { getAIReview };
