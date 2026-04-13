const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const db = require('./db');


// Local Strategy (email + password)
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const { rows } = await db.query(
                'SELECT * FROM users WHERE email = $1 AND provider = $2',
                [email, 'local']
            );

            const user = rows[0];
            if (!user) return done(null, false, { message: 'Invalid email or password.' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Invalid email or password.' });

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const avatar = profile.photos[0]?.value || null;

            // Check if user already exists
            const { rows } = await db.query(
                'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
                ['google', profile.id]
            );

            if (rows[0]) return done(null, rows[0]);

            // Auto-register on first login
            const { rows: newRows } = await db.query(
                'INSERT INTO users (provider, provider_id, email, username, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                ['google', profile.id, email, profile.displayName, avatar]
            );

            return done(null, newRows[0]);
        } catch (err) {
            return done(err);
        }
    }
));
