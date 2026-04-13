const express = require('express');
const auth = require('../middleware/auth');
const {
    upsertCollection,
    removeFromCollection,
    getCollectionStatus,
} = require('../controllers/collections.controller');

const router = express.Router();

// Add or update status
router.post('/', auth, upsertCollection);

// Get status for a specific film
router.get('/:external_id', auth, getCollectionStatus);

// Remove from collection
router.delete('/:external_id', auth, removeFromCollection);

module.exports = router;
