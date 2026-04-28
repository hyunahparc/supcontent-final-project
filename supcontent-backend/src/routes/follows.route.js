// Follow routes — subscribe/unsubscribe between users
const express = require('express');
const auth = require('../middleware/auth');

const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/follows.controller');

const router = express.Router();

// Authenticated routes — POST/DELETE /api/follows/:id
router.post('/:id',   auth, followUser);
router.delete('/:id', auth, unfollowUser);

// Public routes — GET /api/follows/:id/followers|following
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
