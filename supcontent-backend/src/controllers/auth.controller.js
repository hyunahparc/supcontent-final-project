const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const db = require('../config/db');


// Register
const register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Check for duplicate email
        const [existing] = await db.query(
            'SELECT user_id FROM users WHERE email = ? AND provider = "local"',
            [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (provider, email, username, password) VALUES ("local", ?, ?, ?)',
            [email, username, hashedPassword]
        );

        return res.status(201).json({ message: 'Registration successful.', userId: result.insertId });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Login
const login = (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Server error.', error: err.message });
        if (!user) return res.status(401).json({ message: info?.message || 'Login failed.' });

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({ token, user: { user_id: user.user_id, email: user.email, username: user.username } });
    })(req, res, next);
};

// Google OAuth callback
const googleCallback = (req, res) => {
    const user = req.user;

    const token = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Return token to web/app client
    return res.json({ token, user: { user_id: user.user_id, email: user.email, username: user.username } });
};

module.exports = { register, login, googleCallback };
