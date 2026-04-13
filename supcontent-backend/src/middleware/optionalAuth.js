// Like auth middleware, but does not reject unauthenticated requests.
// If a valid token is present, req.user is set; otherwise req.user remains undefined.

const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            // Invalid token — treat as unauthenticated
        }
    }
    next();
}

module.exports = optionalAuth;
