const express = require('express');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const {
    createList,
    getLists,
    getListById,
    updateList,
    deleteList,
    addFilmToList,
    removeFilmFromList,
} = require('../controllers/lists.controller');

const router = express.Router();

// Get my lists
router.get('/', auth, getLists);

// Get a specific list (optionalAuth to check private access)
router.get('/:id', optionalAuth, getListById);

// Create a new list
router.post('/', auth, createList);

// Update a list (rename or change visibility)
router.put('/:id', auth, updateList);

// Delete a list
router.delete('/:id', auth, deleteList);

// Add a film to a list
router.post('/:id/films', auth, addFilmToList);

// Remove a film from a list
router.delete('/:id/films/:external_id', auth, removeFilmFromList);

module.exports = router;
