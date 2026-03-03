require('dotenv').config();
const express = require('express');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');

require('./src/config/db');
require('./src/config/passport');

const app = express();

app.use(express.json());
app.use(passport.initialize());

// Routes
const authRouter = require('./src/routes/auth.route');
const filmsRouter = require('./src/routes/films.route');

app.use('/api/auth', authRouter);
app.use('/api/films', filmsRouter);

// Swagger
const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});

module.exports = { app, server };
