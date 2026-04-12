const express = require('express');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const {
    getReviews,
    getMyReview,
    upsertReview,
    deleteReview,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
} = require('../controllers/reviews.controller');

const router = express.Router();

// Film reviews (public — optionalAuth to resolve liked_by_me)
router.get('/:external_id', optionalAuth, getReviews);

// Own review for a film
router.get('/:external_id/my', auth, getMyReview);

// Create or update own review
router.post('/', auth, upsertReview);

// Delete own review
router.delete('/:review_id', auth, deleteReview);

// Like / unlike a review
router.post('/:review_id/like', auth, toggleLike);

// Comments on a review
router.get('/:review_id/comments', getComments);
router.post('/:review_id/comments', auth, addComment);
router.delete('/:review_id/comments/:comment_id', auth, deleteComment);

module.exports = router;
