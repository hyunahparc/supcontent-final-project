// Follow controller — manage subscriptions between users
const db = require('../config/db');

// POST /api/users/:id/follow  (authenticated)
const followUser = async (req, res) => {
    const followerId = req.user.user_id;
    const followeeId = Number(req.params.id);

    if (isNaN(followeeId)) return res.status(400).json({ message: 'Invalid id.' });
    if (followerId === followeeId) return res.status(400).json({ message: 'You cannot follow yourself.' });

    try {
        await db.query(
            `INSERT INTO follows (follower_id, followee_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [followerId, followeeId]
        );
        return res.status(201).json({ message: 'Followed successfully.' });
    } catch (err) {
        console.error('[followUser]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/users/:id/follow  (authenticated)
const unfollowUser = async (req, res) => {
    const followerId = req.user.user_id;
    const followeeId = Number(req.params.id);

    if (isNaN(followeeId)) return res.status(400).json({ message: 'Invalid id.' });

    try {
        await db.query(
            `DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`,
            [followerId, followeeId]
        );
        return res.json({ message: 'Unfollowed successfully.' });
    } catch (err) {
        console.error('[unfollowUser]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/users/:id/followers  (public)
const getFollowers = async (req, res) => {
    const { id } = req.params;

    if (isNaN(Number(id))) return res.status(400).json({ message: 'Invalid id.' });

    try {
        const { rows } = await db.query(
            `SELECT u.user_id, u.username, u.avatar
             FROM follows f
             JOIN users u ON u.user_id = f.follower_id
             WHERE f.followee_id = $1
             ORDER BY u.username`,
            [id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[getFollowers]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/users/:id/following  (public)
const getFollowing = async (req, res) => {
    const { id } = req.params;

    if (isNaN(Number(id))) return res.status(400).json({ message: 'Invalid id.' });

    try {
        const { rows } = await db.query(
            `SELECT u.user_id, u.username, u.avatar
             FROM follows f
             JOIN users u ON u.user_id = f.followee_id
             WHERE f.follower_id = $1
             ORDER BY u.username`,
            [id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[getFollowing]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { followUser, unfollowUser, getFollowers, getFollowing };
