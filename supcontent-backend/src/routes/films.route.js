const express = require('express');
const { getFilmById, getTrendingFilms } = require('../controllers/films.controller');

const router = express.Router();

// GET /api/films/trending?type=all|Movie|Series&limit=12
// Must be declared before /:id to avoid "trending" being treated as an id
router.get('/trending', getTrendingFilms);

// GET /api/films/:id
router.get('/:id', getFilmById);

module.exports = router;
