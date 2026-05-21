const db = require('../config/db');
const { ACTIVITY_TYPES, createActivity } = require('../services/activity.service');
const { NOTIFICATION_TYPES, createNotification } = require('../services/notification.service');

// GET /api/reviews/:external_id
// Returns all reviews for a film with like count, comment count, and whether the current user liked it
const getReviews = async (req, res) => {
    const { external_id } = req.params;
    // user_id from optional auth — 0 if not logged in (no match possible, liked_by_me = false)
    const viewer_id = req.user?.user_id ?? 0;

    try {
        const { rows } = await db.query(
            `SELECT r.review_id, r.user_id, u.username, u.avatar,
                    r.rating, r.comment, r.created_at, r.updated_at,
                    COUNT(DISTINCT rl.user_id)::int       AS likes_count,
                    COUNT(DISTINCT rc.comment_id)::int    AS comments_count,
                    COALESCE(BOOL_OR(rl.user_id = $2), FALSE) AS liked_by_me
             FROM reviews r
             JOIN users u ON u.user_id = r.user_id
             LEFT JOIN review_likes rl ON rl.review_id = r.review_id
             LEFT JOIN review_comments rc ON rc.review_id = r.review_id
             WHERE r.external_id = $1
             GROUP BY r.review_id, u.username, u.avatar
             ORDER BY r.created_at DESC`,
            [external_id, viewer_id]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/reviews/:external_id/my  — fetch the logged-in user's own review for a film
const getMyReview = async (req, res) => {
    const { external_id } = req.params;
    const user_id = req.user.user_id;

    try {
        const { rows } = await db.query(
            'SELECT * FROM reviews WHERE user_id = $1 AND external_id = $2',
            [user_id, external_id]
        );
        return res.json(rows[0] ?? null);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/reviews  { external_id, rating, comment }
// Creates or updates the user's review for a film (one review per user per film)
const upsertReview = async (req, res) => {
    const { external_id, rating, comment } = req.body;
    const user_id = req.user.user_id;

    if (!external_id) {
        return res.status(400).json({ message: 'external_id is required.' });
    }
    if (rating !== undefined && (rating < 0.5 || rating > 5)) {
        return res.status(400).json({ message: 'Rating must be between 0.5 and 5.' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO reviews (user_id, external_id, rating, comment, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, external_id)
             DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
             RETURNING *`,
            [user_id, external_id, rating ?? null, comment ?? null]
        );

        await createActivity({
            userId: user_id,
            activityType: ACTIVITY_TYPES.REVIEW,
            mediaId: external_id,
            reviewId: rows[0].review_id,
            metadata: {
                rating: rows[0].rating,
                comment: rows[0].comment,
            },
        });

        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/reviews/:review_id
const deleteReview = async (req, res) => {
    const { review_id } = req.params;
    const user_id = req.user.user_id;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM reviews WHERE review_id = $1 AND user_id = $2',
            [review_id, user_id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Review not found or not yours.' });
        }
        return res.json({ message: 'Review deleted.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/reviews/:review_id/like  — toggle like on a review
const toggleLike = async (req, res) => {
    const { review_id } = req.params;
    const user_id = req.user.user_id;

    try {
        // Check if already liked
        const { rows } = await db.query(
            'SELECT 1 FROM review_likes WHERE review_id = $1 AND user_id = $2',
            [review_id, user_id]
        );

        if (rows.length > 0) {
            await db.query(
                'DELETE FROM review_likes WHERE review_id = $1 AND user_id = $2',
                [review_id, user_id]
            );
            return res.json({ liked: false });
        } else {
            await db.query(
                'INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)',
                [review_id, user_id]
            );
            const { rows: reviewRows } = await db.query(
                'SELECT user_id, external_id FROM reviews WHERE review_id = $1',
                [review_id]
            );
            if (reviewRows.length > 0) {
                await createNotification({
                    userId: reviewRows[0].user_id,
                    type: NOTIFICATION_TYPES.LIKE,
                    sourceUserId: user_id,
                    mediaId: reviewRows[0].external_id,
                    reviewId: Number(review_id),
                });
            }
            return res.json({ liked: true });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/reviews/:review_id/comments
const getComments = async (req, res) => {
    const { review_id } = req.params;

    try {
        const { rows } = await db.query(
            `SELECT rc.comment_id, rc.user_id, u.username, u.avatar, rc.content, rc.created_at
             FROM review_comments rc
             JOIN users u ON u.user_id = rc.user_id
             WHERE rc.review_id = $1
             ORDER BY rc.created_at ASC`,
            [review_id]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/reviews/:review_id/comments  { content }
const addComment = async (req, res) => {
    const { review_id } = req.params;
    const { content } = req.body;
    const user_id = req.user.user_id;

    if (!content?.trim()) {
        return res.status(400).json({ message: 'Comment content is required.' });
    }

    try {
        const { rows } = await db.query(
            `WITH inserted AS (
                INSERT INTO review_comments (review_id, user_id, content)
                VALUES ($1, $2, $3)
                RETURNING *
             )
             SELECT i.*, u.username, u.avatar
             FROM inserted i
             JOIN users u ON u.user_id = i.user_id`,
            [review_id, user_id, content.trim()]
        );
        const { rows: reviewRows } = await db.query(
            'SELECT user_id, external_id FROM reviews WHERE review_id = $1',
            [review_id]
        );
        if (reviewRows.length > 0) {
            await createNotification({
                userId: reviewRows[0].user_id,
                type: NOTIFICATION_TYPES.COMMENT,
                sourceUserId: user_id,
                mediaId: reviewRows[0].external_id,
                reviewId: Number(review_id),
            });
        }
        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/reviews/:review_id/comments/:comment_id
const deleteComment = async (req, res) => {
    const { review_id, comment_id } = req.params;
    const user_id = req.user.user_id;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM review_comments WHERE comment_id = $1 AND review_id = $2 AND user_id = $3',
            [comment_id, review_id, user_id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Comment not found or not yours.' });
        }
        return res.json({ message: 'Comment deleted.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getReviews,
    getMyReview,
    upsertReview,
    deleteReview,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
};
