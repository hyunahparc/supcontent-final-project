const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('passport');
const db = require('../config/db');
const generateToken = require('../utils/token');

const OAUTH_CODE_TTL_MINUTES = 5;

function toAuthUser(user) {
    return {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        avatar: user.avatar ?? null,
        preferred_language: user.preferred_language ?? 'fr',
    };
}

function buildRedirectUrl(baseUrl, params) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const query = new URLSearchParams(params).toString();

    return `${baseUrl}${separator}${query}`;
}

function getMobileRedirectUri(state) {
    if (!state) return null;

    try {
        const parsed = JSON.parse(state);
        const redirectUri = parsed.client === 'mobile' ? parsed.redirectUri : null;

        if (
            typeof redirectUri === 'string'
            && (redirectUri.startsWith('supcontent://') || redirectUri.startsWith('exp://'))
        ) {
            return redirectUri;
        }
    } catch {
        return null;
    }

    return null;
}

function hashOAuthCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

async function createOAuthCode(userId) {
    const code = crypto.randomBytes(32).toString('base64url');
    const codeHash = hashOAuthCode(code);

    await db.query(
        `INSERT INTO oauth_codes (code_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
        [codeHash, userId, OAUTH_CODE_TTL_MINUTES]
    );

    return code;
}

// Register
const register = async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Check for duplicate email
        const { rows: existing } = await db.query(
            'SELECT user_id FROM users WHERE email = $1 AND provider = $2',
            [email, 'local']
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows } = await db.query(
            'INSERT INTO users (provider, email, username, password) VALUES ($1, $2, $3, $4) RETURNING user_id',
            ['local', email, username, hashedPassword]
        );

        return res.status(201).json({ message: 'Registration successful.', userId: rows[0].user_id });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Login
const login = (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Server error.', error: err.message });
        if (!user) return res.status(401).json({ message: info?.message || 'Login failed.' });

        return res.json({
            token: generateToken(user),
            user: toAuthUser(user),
        });
    })(req, res, next);
};

// Google OAuth callback
const googleCallback = async (req, res) => {
    const user = req.user;
    const mobileRedirectUri = getMobileRedirectUri(req.query.state);
    const code = await createOAuthCode(user.user_id);

    if (mobileRedirectUri) {
        return res.redirect(buildRedirectUrl(mobileRedirectUri, {
            code,
        }));
    }

    if (!process.env.CLIENT_URL) {
        return res.status(500).json({ message: 'Missing CLIENT_URL.' });
    }

    return res.redirect(buildRedirectUrl(`${process.env.CLIENT_URL}/oauth/callback`, {
        code,
    }));
};

// Exchange a short-lived OAuth code for the normal app session payload.
const exchangeOAuthCode = async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length > 256) {
        return res.status(400).json({ message: 'Missing OAuth code.' });
    }

    try {
        const codeHash = hashOAuthCode(code);

        const { rows: consumed } = await db.query(
            `UPDATE oauth_codes
             SET consumed_at = NOW()
             WHERE code_hash = $1
               AND consumed_at IS NULL
               AND expires_at > NOW()
             RETURNING user_id`,
            [codeHash]
        );

        if (consumed.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OAuth code.' });
        }

        const { rows: users } = await db.query(
            'SELECT * FROM users WHERE user_id = $1',
            [consumed[0].user_id]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid OAuth code.' });
        }

        await db.query('DELETE FROM oauth_codes WHERE expires_at < NOW() - INTERVAL \'1 hour\'');

        return res.json({
            token: generateToken(users[0]),
            user: toAuthUser(users[0]),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { register, login, googleCallback, exchangeOAuthCode };
