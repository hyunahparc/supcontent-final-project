// src/routes/search.route.js
const express = require('express');
const router  = express.Router();
const { search } = require('../controllers/search.controller');

// GET /api/search?q=inception&type=Movie&limit=10
router.get('/', search);

module.exports = router;
