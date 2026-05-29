const tmdb = require('../services/tmdb.service');

const getTrendingMedia = async (req, res) => {
    const { type = 'all', limit = 12 } = req.query;
    try {
        const results = await tmdb.getTrending(type, limit);
        return res.json(results);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getMediaById = (mediaType) => async (req, res) => {
    const { id } = req.params;

    try {
        const media = await tmdb.getMediaById(id, mediaType);
        return res.json(media);
    } catch (err) {
        if (err.status === 404) {
            return res.status(404).json({ message: 'Media not found.' });
        }
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getMovieById: getMediaById('Movie'),
    getTrendingMedia,
    getTvById: getMediaById('Series'),
};
