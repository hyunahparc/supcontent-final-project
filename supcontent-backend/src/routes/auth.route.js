const express = require('express');
const passport = require('passport');
const { register, login, googleCallback } = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

const router = express.Router();

// GET /api/auth/health
router.get('/health', (_req, res) => res.json({ status: 'ok' }));

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/login' }),
    googleCallback
);

module.exports = router;
