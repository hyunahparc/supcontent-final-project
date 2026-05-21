const db = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const { rows } = await db.query(
            `SELECT
                n.notification_id,
                n.type,
                n.is_read,
                n.created_at,
                n.media_id,
                n.review_id,
                u.user_id  AS source_user_id,
                u.username AS source_username,
                u.avatar   AS source_avatar,
                mc.full_data->>'title' AS media_title
             FROM notifications n
             LEFT JOIN users u        ON u.user_id      = n.source_user_id
             LEFT JOIN media_cache mc ON mc.external_id = n.media_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const { rows } = await db.query(
            `SELECT COUNT(*)::int AS count
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );
        return res.json({ count: rows[0].count });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
    const userId = req.user.user_id;

    try {
        await db.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
            [userId]
        );
        return res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PATCH /api/notifications/:id/read
const markOneRead = async (req, res) => {
    const userId = req.user.user_id;
    const { id }  = req.params;

    try {
        await db.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE notification_id = $1 AND user_id = $2`,
            [id, userId]
        );
        return res.json({ message: 'Notification marked as read.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { getNotifications, getUnreadCount, markAllRead, markOneRead };
