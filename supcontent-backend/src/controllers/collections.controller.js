const db = require('../config/db');
const { ACTIVITY_TYPES, createActivity } = require('../services/activity.service');

const VALID_STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];

// GET /api/users/:id/library?status=xxx
const getLibrary = async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;

    try {
        const params = [id];
        let statusFilter = '';

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ message: 'Invalid status.' });
            }
            statusFilter = 'AND c.status = $2';
            params.push(status);
        }

        const { rows } = await db.query(
            `SELECT c.collection_id, c.status, c.created_at,
                    c.external_id, m.media_type, m.full_data
             FROM collections c
             JOIN media_cache m ON m.external_id = c.external_id
             WHERE c.user_id = $1 ${statusFilter}
             ORDER BY c.created_at DESC`,
            params
        );

        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/collections  { external_id, status }
const upsertCollection = async (req, res) => {
    const { external_id, status } = req.body;
    const user_id = req.user.user_id;

    if (!external_id || !status) {
        return res.status(400).json({ message: 'external_id and status are required.' });
    }
    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO collections (user_id, external_id, status)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, external_id) DO UPDATE SET status = $3
             RETURNING *`,
            [user_id, external_id, status]
        );

        await createActivity({
            userId: user_id,
            activityType: ACTIVITY_TYPES.COLLECTION,
            mediaId: external_id,
            metadata: { status },
        });

        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/collections/:external_id
const removeFromCollection = async (req, res) => {
    const { external_id } = req.params;
    const user_id = req.user.user_id;

    try {
        await db.query(
            'DELETE FROM collections WHERE user_id = $1 AND external_id = $2',
            [user_id, external_id]
        );
        return res.json({ message: 'Removed from collection.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/collections/:external_id  (check current status for a film)
const getCollectionStatus = async (req, res) => {
    const { external_id } = req.params;
    const user_id = req.user.user_id;

    try {
        const { rows } = await db.query(
            'SELECT status FROM collections WHERE user_id = $1 AND external_id = $2',
            [user_id, external_id]
        );
        return res.json({ status: rows[0]?.status ?? null });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { getLibrary, upsertCollection, removeFromCollection, getCollectionStatus };
