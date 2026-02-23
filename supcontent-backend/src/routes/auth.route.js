const express = require('express');
const passport = require('passport');
const { register, login, googleCallback } = require('../controllers/auth.controller');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/login' }),
    googleCallback
);

module.exports = router;
