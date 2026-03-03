const express = require('express');
const { getFilmById } = require('../controllers/films.controller');

const router = express.Router();

// GET /api/films/:id
router.get('/:id', getFilmById);

module.exports = router;
