const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('passport');
const db = require('../config/db');
const { generateAccessToken } = require('../utils/token');
const {
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    cleanupRefreshTokens,
} = require('../services/refreshToken.service');

// Lifetime of the one-time OAuth handoff code (see createOAuthCode below).
const OAUTH_CODE_TTL_MINUTES = 5;

// Shared helpers
// Shape the public user object returned to clients (never expose password, etc.).
function toAuthUser(user) {
    return {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        avatar: user.avatar ?? null,
        preferred_language: user.preferred_language ?? 'en',
    };
}

// Google OAuth — helpers
// Append query params to a URL, picking '?' or '&' depending on what it already has.
function buildRedirectUrl(baseUrl, params) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const query = new URLSearchParams(params).toString();

    return `${baseUrl}${separator}${query}`;
}

// Read the mobile deep-link redirect URI from the OAuth `state` param.
// Returns it only if it is a trusted app scheme, otherwise null (security guard).
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

// Hash a code before storing/looking it up, so the raw value never touches the DB.
function hashOAuthCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

// Create a short-lived, single-use code that the OAuth redirect hands to the client.
// the client then exchanges it for real tokens (see exchangeOAuthCode).
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

// Local auth (email / password)
// Register — create a local (email/password) account.
const register = async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Reject if a local account already uses this email.
        const { rows: existing } = await db.query(
            'SELECT user_id FROM users WHERE email = $1 AND provider = $2',
            [email, 'local']
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        // Never store the raw password — hash it with bcrypt.
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

// Login — verify credentials via passport, then issue a token pair.
const login = (req, res, next) => {
    passport.authenticate('local', { session: false }, async (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Server error.', error: err.message });
        if (!user) return res.status(401).json({ message: info?.message || 'Login failed.' });

        try {
            // Short-lived access token (in `token`) + long-lived refresh token.
            const refreshToken = await issueRefreshToken(user.user_id);
            return res.json({
                token: generateAccessToken(user),
                refreshToken,
                user: toAuthUser(user),
            });
        } catch (e) {
            return res.status(500).json({ message: 'Server error.', error: e.message });
        }
    })(req, res, next);
};

// Google OAuth — handlers
// Google redirects here after the user approves.
// Passport has already attached the user; we hand a one-time code back to the
// client (web URL or mobile deep link) instead of putting tokens in the URL.
const googleCallback = async (req, res) => {
    const user = req.user;
    const mobileRedirectUri = getMobileRedirectUri(req.query.state);
    const code = await createOAuthCode(user.user_id);

    // Mobile: redirect to the app's deep link with the code.
    if (mobileRedirectUri) {
        return res.redirect(buildRedirectUrl(mobileRedirectUri, {
            code,
        }));
    }

    if (!process.env.CLIENT_URL) {
        return res.status(500).json({ message: 'Missing CLIENT_URL.' });
    }

    // Web: redirect to the SPA's callback route with the code.
    return res.redirect(buildRedirectUrl(`${process.env.CLIENT_URL}/oauth/callback`, {
        code,
    }));
};

// POST /oauth/exchange — the client swaps the one-time OAuth code for a token pair.
const exchangeOAuthCode = async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length > 256) {
        return res.status(400).json({ message: 'Missing OAuth code.' });
    }

    try {
        const codeHash = hashOAuthCode(code);

        // Atomically consume the code: mark it used only if still valid+unused.
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

        // Opportunistic cleanup of old codes, then issue the session tokens.
        await db.query('DELETE FROM oauth_codes WHERE expires_at < NOW() - INTERVAL \'1 hour\'');

        const refreshToken = await issueRefreshToken(users[0].user_id);
        return res.json({
            token: generateAccessToken(users[0]),
            refreshToken,
            user: toAuthUser(users[0]),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Refresh tokens (rotation + logout)
// exchange a valid refresh token for a new access token (and rotate the refresh token itself).
const refresh = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ message: 'Missing refresh token.' });
    }

    try {
        // Validate + rotate: the old refresh token is revoked and a new one returned.
        const rotated = await rotateRefreshToken(refreshToken);
        if (!rotated) {
            return res.status(401).json({ message: 'Invalid or expired refresh token.' });
        }

        // Reload the user so the client gets fresh profile data on refresh.
        const { rows: users } = await db.query(
            'SELECT * FROM users WHERE user_id = $1',
            [rotated.userId]
        );
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid refresh token.' });
        }

        // Opportunistic housekeeping of expired/revoked rows.
        await cleanupRefreshTokens();

        return res.json({
            token: generateAccessToken(users[0]),
            refreshToken: rotated.token,
            user: toAuthUser(users[0]),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Log out: revoke the refresh token so it can no longer be used to mint access tokens.
const logout = async (req, res) => {
    const { refreshToken } = req.body;

    try {
        await revokeRefreshToken(refreshToken);
        return res.json({ message: 'Logged out.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { register, login, googleCallback, exchangeOAuthCode, refresh, logout };
