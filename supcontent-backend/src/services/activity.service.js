const db = require('../config/db');

const ACTIVITY_TYPES = {
    REVIEW: 'review',
    COLLECTION: 'collection',
};

async function createActivity({
    userId,
    activityType,
    targetUserId = null,
    mediaId = null,
    reviewId = null,
    metadata = {},
}) {
    if (!userId || !activityType) {
        return null;
    }

    if (!Object.values(ACTIVITY_TYPES).includes(activityType)) {
        return null;
    }

    const { rows } = await db.query(
        `INSERT INTO activity_log (
            user_id,
            activity_type,
            target_user_id,
            media_id,
            review_id,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [userId, activityType, targetUserId, mediaId, reviewId, JSON.stringify(metadata)]
    );

    return rows[0];
}

module.exports = {
    ACTIVITY_TYPES,
    createActivity,
};
