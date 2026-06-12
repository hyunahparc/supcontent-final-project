// Contrôleur modération — 2.2.5 du cahier des charges
// Utilisateurs : signaler une critique
// Admins : lister signalements, supprimer critique, bannir user, gérer coups de cœur

const db = require('../config/db');

// ── Utilisateurs ──────────────────────────────────────────────────────────────

// POST /api/moderation/reports  { review_id, reason }
const reportReview = async (req, res) => {
    const reporter_id = req.user.user_id;
    const { review_id, reason } = req.body;

    if (!review_id)
        return res.status(400).json({ message: 'review_id est requis.' });

    try {
        const { rows: reviewRows } = await db.query(
            'SELECT user_id FROM reviews WHERE review_id = $1',
            [review_id]
        );
        if (!reviewRows[0])
            return res.status(404).json({ message: 'Critique introuvable.' });
        if (reviewRows[0].user_id === reporter_id)
            return res.status(400).json({ message: 'Vous ne pouvez pas signaler votre propre critique.' });

        // ON CONFLICT DO NOTHING : un utilisateur ne signale qu'une fois la même critique
        await db.query(
            `INSERT INTO moderation_reports (review_id, reporter_id, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [review_id, reporter_id, reason?.trim() || null]
        );
        return res.status(201).json({ message: 'Signalement enregistré.' });
    } catch (err) {
        console.error('[reportReview]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// ── Admins ────────────────────────────────────────────────────────────────────

// GET /api/moderation/reports?status=pending|resolved|rejected
const getReports = async (req, res) => {
    const { status = 'pending' } = req.query;
    if (!['pending', 'resolved', 'rejected'].includes(status))
        return res.status(400).json({ message: 'Statut invalide.' });

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
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// PATCH /api/moderation/reports/:report_id  { status: 'resolved'|'rejected' }
const updateReportStatus = async (req, res) => {
    const { report_id } = req.params;
    const { status } = req.body;
    if (!['resolved', 'rejected'].includes(status))
        return res.status(400).json({ message: 'Statut invalide.' });

    try {
        const { rowCount } = await db.query(
            'UPDATE moderation_reports SET status = $1 WHERE report_id = $2',
            [status, report_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Signalement introuvable.' });
        return res.json({ message: `Signalement marqué "${status}".` });
    } catch (err) {
        console.error('[updateReportStatus]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// DELETE /api/moderation/reviews/:review_id
const deleteReportedReview = async (req, res) => {
    const { review_id } = req.params;
    try {
        // Résoudre les signalements avant suppression (intégrité référentielle)
        await db.query(
            `UPDATE moderation_reports SET status = 'resolved' WHERE review_id = $1`,
            [review_id]
        );
        const { rowCount } = await db.query(
            'DELETE FROM reviews WHERE review_id = $1',
            [review_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Critique introuvable.' });
        return res.json({ message: 'Critique supprimée, signalements résolus.' });
    } catch (err) {
        console.error('[deleteReportedReview]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// PATCH /api/moderation/users/:user_id/ban  { banned: true|false }
const banUser = async (req, res) => {
    const { user_id } = req.params;
    const { banned } = req.body;
    if (typeof banned !== 'boolean')
        return res.status(400).json({ message: '"banned" doit être un booléen.' });
    if (Number(user_id) === req.user.user_id)
        return res.status(400).json({ message: 'Un administrateur ne peut pas se bannir lui-même.' });

    try {
        const { rowCount } = await db.query(
            'UPDATE users SET is_banned = $1 WHERE user_id = $2',
            [banned, user_id]
        );
        if (rowCount === 0)
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        return res.json({ message: banned ? `Utilisateur ${user_id} banni.` : `Utilisateur ${user_id} débanni.` });
    } catch (err) {
        console.error('[banUser]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// POST /api/moderation/highlights  { review_id }
const highlightReview = async (req, res) => {
    const { review_id } = req.body;
    if (!review_id)
        return res.status(400).json({ message: 'review_id est requis.' });

    try {
        const { rows } = await db.query(
            `INSERT INTO highlighted_reviews (review_id)
             VALUES ($1) ON CONFLICT DO NOTHING RETURNING *`,
            [review_id]
        );
        if (!rows[0])
            return res.json({ message: 'Cette critique est déjà mise en avant.' });
        return res.status(201).json({ message: 'Critique mise en avant.', highlight: rows[0] });
    } catch (err) {
        console.error('[highlightReview]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
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
            return res.status(404).json({ message: 'Mise en avant introuvable.' });
        return res.json({ message: 'Mise en avant retirée.' });
    } catch (err) {
        console.error('[removeHighlight]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
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
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

module.exports = {
    reportReview, getReports, updateReportStatus,
    deleteReportedReview, banUser,
    highlightReview, removeHighlight, getHighlights,
};
