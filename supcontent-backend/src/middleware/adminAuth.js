// Middleware admin — vérifie JWT valide + is_admin = true en base
// Le double contrôle (token + BDD) empêche l'escalade de privilège
// si is_admin est modifié après émission du token.

const jwt = require('jsonwebtoken');
const db  = require('../config/db');

async function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ message: 'Aucun token fourni.' });

    const token = authHeader.split(' ')[1];
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT user_id, is_admin FROM users WHERE user_id = $1',
            [payload.user_id]
        );
        if (!rows[0] || !rows[0].is_admin)
            return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });

        req.user = payload;
        next();
    } catch (err) {
        console.error('[adminAuth]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
}

module.exports = adminAuth;
