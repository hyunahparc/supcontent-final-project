require('dotenv').config();
const express = require('express');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');

require('./src/config/db');
require('./src/config/passport');

const app = express();

const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));

app.use(express.json());
app.use(passport.initialize());

// Routes
const authRouter = require('./src/routes/auth.route');
const filmsRouter = require('./src/routes/films.route');
const searchRouter = require('./src/routes/search.route');
const collectionsRouter = require('./src/routes/collections.route');
const usersRouter = require('./src/routes/users.route');
const reviewsRouter = require('./src/routes/reviews.route');
const listsRouter = require('./src/routes/lists.route');
const followsRouter = require('./src/routes/follows.route');
const feedRouter = require('./src/routes/feed.route');
const notificationsRouter = require('./src/routes/notifications.route');
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/films', filmsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/lists', listsRouter);
app.use('/api/follows', followsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/notifications', notificationsRouter);

// Swagger
const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});

module.exports = { app, server };
