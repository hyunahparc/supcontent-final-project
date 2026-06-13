require('dotenv').config();
const express = require('express');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const { createRateLimiter, toPositiveNumber } = require('./src/middleware/rateLimit');

require('./src/config/db');
require('./src/config/passport');

const app = express();
app.set('trust proxy', 1);

const cors = require('cors');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

app.use(express.json());
app.use(passport.initialize());

const apiLimiter = createRateLimiter({
    name: 'api',
    windowMs: toPositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toPositiveNumber(process.env.RATE_LIMIT_MAX, 600),
    skip: (req) => req.path === '/auth/health',
});

const expensiveLimiter = createRateLimiter({
    name: 'expensive',
    windowMs: toPositiveNumber(process.env.EXPENSIVE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: toPositiveNumber(process.env.EXPENSIVE_RATE_LIMIT_MAX, 80),
});

const authLimiter = createRateLimiter({
    name: 'auth',
    windowMs: toPositiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toPositiveNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
    message: 'Too many authentication attempts. Please try again later.',
});

app.use('/api', apiLimiter);
app.use('/api/search', expensiveLimiter);
app.use('/api/media', expensiveLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/oauth/exchange', authLimiter);

// Routes
const authRouter = require('./src/routes/auth.route');
const mediaRouter = require('./src/routes/media.route');
const searchRouter = require('./src/routes/search.route');
const collectionsRouter = require('./src/routes/collections.route');
const usersRouter = require('./src/routes/users.route');
const reviewsRouter = require('./src/routes/reviews.route');
const listsRouter = require('./src/routes/lists.route');
const followsRouter = require('./src/routes/follows.route');
const feedRouter = require('./src/routes/feed.route');
const notificationsRouter = require('./src/routes/notifications.route');
const messagesRouter = require('./src/routes/messages.route');
const moderationRouter = require('./src/routes/moderation.route');
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/lists', listsRouter);
app.use('/api/follows', followsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/moderation', moderationRouter);

// Swagger
const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});

module.exports = { app, server };
