// src/routes/search.route.js
// Specific routes (/genres, /advanced) MUST be declared
// BEFORE the generic route (/) so Express does not confuse them.

const express = require('express');
const router  = express.Router();
const { search, getGenres, advancedSearch } = require('../controllers/search.controller');

// GET /api/search/genres?type=movie|tv
router.get('/genres', getGenres);

// GET /api/search/advanced?q=&type=&year=&genre=&sort=&min_rating=&page=
router.get('/advanced', advancedSearch);

// GET /api/search?q=inception&type=Movie&limit=10  (generic route — last)
router.get('/', search);

module.exports = router;
