// Moderation controller.
// Users can report reviews; admins can review reports and remove reported content.


const db = require('../config/db');


// POST /api/moderation/reports  { review_id, reason }
const reportReview = async (req, res) => {
    const reporter_id = req.user.user_id;
    const { review_id, reason } = req.body;

    if (!review_id)
        return res.status(400).json({ message: 'review_id is required.' });

    try {
        const { rows: reviewRows } = await db.query(
            'SELECT user_id FROM reviews WHERE review_id = $1',
            [review_id]
        );
        if (!reviewRows[0])
            return res.status(404).json({ message: 'Review not found.' });
        if (reviewRows[0].user_id === reporter_id)
            return res.status(400).json({ message: 'You cannot report your own review.' });

        // The unique constraint allows each user to report the same review only once.
        const { rowCount } = await db.query(
            `INSERT INTO moderation_reports (review_id, reporter_id, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [review_id, reporter_id, reason?.trim() || null]
        );

        if (rowCount === 0) {
            return res.status(409).json({ message: 'You can only report a review once.' });
        }

        return res.status(201).json({ message: 'Report saved.' });
    } catch (err) {
        console.error('[reportReview]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};


// GET /api/moderation/reports?status=pending|resolved|rejected
const getReports = async (req, res) => {
    const { status = 'pending' } = req.query;
    if (!['pending', 'resolved', 'rejected'].includes(status))
        return res.status(400).json({ message: 'Invalid status.' });

    try {
        const { rows } = await db.query(
            `SELECT
                mr.report_id, mr.reason, mr.status, mr.created_at,
                r.review_id, r.comment AS review_comment, r.rating AS review_rating,
                r.external_id, r.media_type,
                u_author.user_id  AS author_id,
                u_author.username AS author_username,
                u_rep.user_id     AS reporter_id,
                u_rep.username    AS reporter_username
             FROM moderation_reports mr
             JOIN reviews r      ON r.review_id    = mr.review_id
             JOIN users u_author ON u_author.user_id = r.user_id
             JOIN users u_rep    ON u_rep.user_id   = mr.reporter_id
             WHERE mr.status = $1
             ORDER BY mr.created_at DESC`,
            [status]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[getReports]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PATCH /api/moderation/reports/:report_id  { status: 'resolved'|'rejected' }
const updateReportStatus = async (req, res) => {
    const { report_id } = req.params;
    const { status } = req.body;
    if (!['resolved', 'rejected'].includes(status))
        return res.status(400).json({ message: 'Invalid status.' });

    try {
        const { rowCount } = await db.query(
            'UPDATE moderation_reports SET status = $1 WHERE report_id = $2',
            [status, report_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Report not found.' });
        return res.json({ message: `Report marked "${status}".` });
    } catch (err) {
        console.error('[updateReportStatus]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/moderation/reviews/:review_id
const deleteReportedReview = async (req, res) => {
    const { review_id } = req.params;
    try {
        // Resolve reports before deleting the review.
        await db.query(
            `UPDATE moderation_reports SET status = 'resolved' WHERE review_id = $1`,
            [review_id]
        );
        const { rowCount } = await db.query(
            'DELETE FROM reviews WHERE review_id = $1',
            [review_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Review not found.' });
        return res.json({ message: 'Review deleted and reports resolved.' });
    } catch (err) {
        console.error('[deleteReportedReview]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PATCH /api/moderation/users/:user_id/ban  { banned: true|false }
const banUser = async (req, res) => {
    const { user_id } = req.params;
    const { banned } = req.body;
    if (typeof banned !== 'boolean')
        return res.status(400).json({ message: '"banned" must be a boolean.' });
    if (Number(user_id) === req.user.user_id)
        return res.status(400).json({ message: 'An administrator cannot ban themselves.' });

    try {
        const { rowCount } = await db.query(
            'UPDATE users SET is_banned = $1 WHERE user_id = $2',
            [banned, user_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'User not found.' });
        return res.json({ message: banned ? `User ${user_id} banned.` : `User ${user_id} unbanned.` });
    } catch (err) {
        console.error('[banUser]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/moderation/highlights  { review_id }
const highlightReview = async (req, res) => {
    const { review_id } = req.body;
    if (!review_id)
        return res.status(400).json({ message: 'review_id is required.' });

    try {
        const { rows } = await db.query(
            `INSERT INTO highlighted_reviews (review_id)
             VALUES ($1) ON CONFLICT DO NOTHING RETURNING *`,
            [review_id]
        );
        if (!rows[0])
            return res.json({ message: 'This review is already highlighted.' });
        return res.status(201).json({ message: 'Review highlighted.', highlight: rows[0] });
    } catch (err) {
        console.error('[highlightReview]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// DELETE /api/moderation/highlights/:review_id
const removeHighlight = async (req, res) => {
    const { review_id } = req.params;
    try {
        const { rowCount } = await db.query(
            'DELETE FROM highlighted_reviews WHERE review_id = $1',
            [review_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Highlight not found.' });
        return res.json({ message: 'Highlight removed.' });
    } catch (err) {
        console.error('[removeHighlight]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/moderation/highlights  (public)
const getHighlights = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT hr.highlight_id, hr.created_at AS highlighted_at,
                r.review_id, r.comment, r.rating, r.external_id, r.media_type,
                u.user_id, u.username, u.avatar
             FROM highlighted_reviews hr
             JOIN reviews r ON r.review_id = hr.review_id
             JOIN users   u ON u.user_id   = r.user_id
             ORDER BY hr.created_at DESC`
        );
        return res.json(rows);
    } catch (err) {
        console.error('[getHighlights]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    reportReview, getReports, updateReportStatus,
    deleteReportedReview, banUser,
    highlightReview, removeHighlight, getHighlights,
};
