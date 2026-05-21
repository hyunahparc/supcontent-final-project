const express = require('express');
const auth = require('../middleware/auth');
const {
    getNotifications,
    getUnreadCount,
    markAllRead,
    markOneRead,
} = require('../controllers/notifications.controller');

const router = express.Router();

router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllRead);
router.patch('/:id/read', auth, markOneRead);

module.exports = router;
