const crypto = require('crypto');
const db = require('../config/db');
const { generateRefreshToken } = require('../utils/token');

const REFRESH_TOKEN_TTL_DAYS = 30;

// Store only the hash, never the raw token (same approach as oauth_codes).
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Issue a new refresh token for a user and persist its hash.
async function issueRefreshToken(userId) {
    const token = generateRefreshToken();

    await db.query(
        `INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
        [hashToken(token), userId, REFRESH_TOKEN_TTL_DAYS]
    );

    return token;
}

// Validate a refresh token and rotate it: revoke the old one, issue a new one.
// Returns { userId, token } on success, or null when invalid/expired/revoked.
async function rotateRefreshToken(token) {
    if (!token || typeof token !== 'string') return null;

    const { rows } = await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1
           AND revoked_at IS NULL
           AND expires_at > NOW()
         RETURNING user_id`,
        [hashToken(token)]
    );

    if (rows.length === 0) return null;

    const userId = rows[0].user_id;
    const newToken = await issueRefreshToken(userId);

    return { userId, token: newToken };
}

// Revoke a refresh token on logout. Safe to call with an unknown token.
async function revokeRefreshToken(token) {
    if (!token || typeof token !== 'string') return;

    await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hashToken(token)]
    );
}

// Housekeeping: drop rows that expired or were revoked more than a day ago.
async function cleanupRefreshTokens() {
    await db.query(
        `DELETE FROM refresh_tokens
         WHERE expires_at < NOW() - INTERVAL '1 day'
            OR revoked_at < NOW() - INTERVAL '1 day'`
    );
}

module.exports = {
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    cleanupRefreshTokens,
};
