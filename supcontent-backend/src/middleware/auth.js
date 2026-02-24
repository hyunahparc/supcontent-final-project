// Token verification middleware

const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided.' });

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

module.exports = auth;
