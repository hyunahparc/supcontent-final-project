const express = require('express');
const { getLibrary } = require('../controllers/collections.controller');

const router = express.Router();

// GET /api/users/:id/collection?status=xxx
router.get('/:id/collection', getLibrary);

module.exports = router;
