const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require('../config/db');
const generateToken = require('../utils/token');


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

        const token = generateToken(user);

        return res.json({ token, user: { user_id: user.user_id, email: user.email, username: user.username, avatar: user.avatar ?? null, preferred_language: user.preferred_language ?? 'fr' } });
    })(req, res, next);
};

// Google OAuth callback
const googleCallback = (req, res) => {
    const user = req.user;

    const token = generateToken(user);
    const userData = encodeURIComponent(JSON.stringify({ user_id: user.user_id, email: user.email, username: user.username, avatar: user.avatar ?? null, preferred_language: user.preferred_language ?? 'fr' }));

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/oauth/callback?token=${token}&user=${userData}`);
};

module.exports = { register, login, googleCallback };
