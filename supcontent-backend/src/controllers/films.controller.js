const tmdb = require('../services/tmdb.service');

const getTrendingFilms = async (req, res) => {
    const { type = 'all', limit = 12 } = req.query;
    try {
        const results = await tmdb.getTrending(type, limit);
        return res.json(results);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getFilmById = async (req, res) => {
    const { id } = req.params;

    try {
        const film = await tmdb.getFilmById(id);
        return res.json(film);
    } catch (err) {
        if (err.status === 404) {
            return res.status(404).json({ message: 'Film not found.' });
        }
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { getFilmById, getTrendingFilms };
