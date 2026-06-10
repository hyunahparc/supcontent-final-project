const express = require('express');
const passport = require('passport');
const { register, login, googleCallback, exchangeOAuthCode } = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

const router = express.Router();

function getOAuthState(state) {
    if (!state) return null;

    try {
        return JSON.parse(state);
    } catch {
        return null;
    }
}

function getGoogleCallbackUrl(req, isMobile = false) {
    if (isMobile && process.env.GOOGLE_MOBILE_CALLBACK_URL) {
        return process.env.GOOGLE_MOBILE_CALLBACK_URL;
    }

    if (!isMobile && process.env.GOOGLE_CALLBACK_URL) {
        return process.env.GOOGLE_CALLBACK_URL;
    }

    return null;
}

// GET /api/auth/health
router.get('/health', (_req, res) => res.json({ status: 'ok' }));

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/oauth/exchange
router.post('/oauth/exchange', exchangeOAuthCode);

// GET /api/auth/google
router.get('/google', (req, res, next) => {
    const isMobile = req.query.client === 'mobile';
    const callbackURL = getGoogleCallbackUrl(req, isMobile);

    if (!callbackURL) {
        return res.status(500).json({ message: 'Missing Google OAuth callback URL.' });
    }

    const state = isMobile
        ? JSON.stringify({
            client: 'mobile',
            redirectUri: req.query.redirect_uri,
        })
        : undefined;

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state,
        callbackURL,
    })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/google/callback', (req, res, next) => {
    const state = getOAuthState(req.query.state);
    const callbackURL = getGoogleCallbackUrl(req, state?.client === 'mobile');

    if (!callbackURL) {
        return res.status(500).json({ message: 'Missing Google OAuth callback URL.' });
    }

    passport.authenticate('google', {
        session: false,
        failureRedirect: '/api/auth/login',
        callbackURL,
    })(req, res, next);
},
    googleCallback
);

module.exports = router;
