// Routes modération — 2.2.5
// auth      : utilisateur connecté (signalement)
// adminAuth : administrateur (gestion)

const express   = require('express');
const auth      = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
    reportReview,
    getReports, updateReportStatus,
    deleteReportedReview, banUser,
    highlightReview, removeHighlight, getHighlights,
} = require('../controllers/moderation.controller');

const router = express.Router();

// Utilisateurs
router.post('/reports', auth, reportReview);

// Public
router.get('/highlights', getHighlights);

// Admins
router.get('/reports',                    adminAuth, getReports);
router.patch('/reports/:report_id',       adminAuth, updateReportStatus);
router.delete('/reviews/:review_id',      adminAuth, deleteReportedReview);
router.patch('/users/:user_id/ban',       adminAuth, banUser);
router.post('/highlights',                adminAuth, highlightReview);
router.delete('/highlights/:review_id',   adminAuth, removeHighlight);

module.exports = router;
