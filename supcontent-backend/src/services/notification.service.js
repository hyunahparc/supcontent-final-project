const db = require('../config/db');

const NOTIFICATION_TYPES = {
    LIKE:    'like',
    COMMENT: 'comment',
    FOLLOW:  'follow',
};

async function createNotification({ userId, type, sourceUserId, mediaId = null, reviewId = null }) {
    if (userId === sourceUserId) return null;

    await db.query(
        `INSERT INTO notifications (user_id, type, source_user_id, media_id, review_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, sourceUserId, mediaId, reviewId]
    );
}

module.exports = { NOTIFICATION_TYPES, createNotification };
