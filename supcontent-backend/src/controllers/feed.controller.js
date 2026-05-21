const db = require('../config/db');

const getFeed = async (req, res) => {
    const userId = req.user.user_id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;

    try {
        const { rows } = await db.query(
            `SELECT
                a.activity_id,
                a.activity_type,
                a.metadata,
                a.created_at,

                actor.user_id AS actor_id,
                actor.username AS actor_username,
                actor.avatar AS actor_avatar,

                m.external_id,
                m.media_type,
                m.full_data,

                a.review_id,
                (a.metadata->>'rating')::NUMERIC AS rating,
                a.metadata->>'comment'           AS comment
            FROM activity_log a
            JOIN follows f
                ON f.followee_id = a.user_id
            JOIN users actor
                ON actor.user_id = a.user_id
            LEFT JOIN media_cache m
                ON m.external_id = a.media_id
            WHERE f.follower_id = $1
              AND a.activity_type IN ('review', 'collection')
            ORDER BY a.created_at DESC
            LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return res.json({
            limit,
            offset,
            total: rows.length,
            results: rows,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Server error.',
            error: err.message,
        });
    }
};

module.exports = {
    getFeed,
};
