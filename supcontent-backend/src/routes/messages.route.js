const express = require('express');
const auth = require('../middleware/auth');
const {
    getConversations,
    getUnreadMessageCount,
    getMessagesWithUser,
    sendMessage,
} = require('../controllers/messages.controller');

const router = express.Router();

router.get('/conversations', auth, getConversations);
router.get('/unread-count', auth, getUnreadMessageCount);
router.get('/:userId', auth, getMessagesWithUser);
router.post('/:userId', auth, sendMessage);

module.exports = router;
