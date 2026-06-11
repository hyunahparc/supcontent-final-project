const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Access token: a signed JWT attached to every API request. Kept short-lived
function generateAccessToken(user) {
    return jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
}

// Refresh token: an opaque random string. It carries no claims — it is validated
// by looking up its hash in the refresh_tokens table, so it can be revoked.
function generateRefreshToken() {
    return crypto.randomBytes(32).toString('base64url');
}

module.exports = { generateAccessToken, generateRefreshToken };
