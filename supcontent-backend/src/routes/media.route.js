const express = require('express');
const { getMovieById, getTrendingMedia, getTvById } = require('../controllers/media.controller');

const router = express.Router();

router.get('/trending', getTrendingMedia);
router.get('/movie/:id', getMovieById);
router.get('/tv/:id', getTvById);

module.exports = router;
