// Contrôleur utilisateur — profil public, mise à jour, upload d'avatar
const db   = require('../config/db');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// AUCUNE initialisation Supabase/multer au niveau du module.
// Tout est chargé à la demande, à l'intérieur des handlers.
// Le serveur démarre normalement même sans SUPABASE_URL dans le .env.
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/users/:id/profile  (public, optionalAuth) ───────────────────────
const getProfile = async (req, res) => {
    const { id } = req.params;
    const viewerId = req.user?.user_id ?? null;

    if (isNaN(Number(id))) {
        return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    try {
        const { rows } = await db.query(
            `SELECT
                u.user_id,
                u.username,
                u.avatar,
                u.bio,
                u.created_at,
                COUNT(DISTINCT f_in.follower_id)::int  AS followers_count,
                COUNT(DISTINCT f_out.followee_id)::int AS following_count,
                COUNT(DISTINCT c.collection_id)::int   AS media_count,
                CASE WHEN $2::int IS NOT NULL
                    THEN EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = u.user_id)
                    ELSE false
                END AS is_following
             FROM users u
             LEFT JOIN follows     f_in  ON f_in.followee_id  = u.user_id
             LEFT JOIN follows     f_out ON f_out.follower_id = u.user_id
             LEFT JOIN collections c     ON c.user_id         = u.user_id
             WHERE u.user_id = $1
             GROUP BY u.user_id`,
            [id, viewerId]
        );

        if (!rows[0]) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        return res.json(rows[0]);
    } catch (err) {
        console.error('[getProfile]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// ── GET /api/users/:id/stats  (public) ───────────────────────────────────────
// Retourne { "Terminé": 12, "À voir": 5, … }
const getProfileStats = async (req, res) => {
    const { id } = req.params;

    if (isNaN(Number(id))) {
        return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    try {
        const { rows } = await db.query(
            `SELECT status, COUNT(*)::int AS count
             FROM collections
             WHERE user_id = $1
             GROUP BY status`,
            [id]
        );

        const stats = rows.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, {});

        return res.json(stats);
    } catch (err) {
        console.error('[getProfileStats]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// ── PUT /api/users/me/profile  (authentifié) ─────────────────────────────────
const updateProfile = async (req, res) => {
    const user_id = req.user.user_id;
    const { username, bio } = req.body;

    if (username !== undefined) {
        const trimmed = (username || '').trim();
        if (trimmed.length < 3 || trimmed.length > 50) {
            return res.status(400).json({ message: 'Username must be between 3 and 50 characters.' });
        }
    }

    if (bio !== undefined && bio.length > 500) {
        return res.status(400).json({ message: 'Bio cannot exceed 500 characters.' });
    }

    try {
        const { rows } = await db.query(
            `UPDATE users
             SET username = COALESCE($1, username),
                 bio      = COALESCE($2, bio)
             WHERE user_id = $3
             RETURNING user_id, username, avatar, bio`,
            [username?.trim() ?? null, bio ?? null, user_id]
        );

        return res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ message: 'This username is already taken.' });
        }
        console.error('[updateProfile]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ── POST /api/users/me/avatar  (authentifié) ─────────────────────────────────
// Multer et Supabase sont requis ICI uniquement, jamais au démarrage.
// Si les packages sont absents, retourne 503 proprement.
const uploadAvatar = async (req, res) => {
    // 1. Vérifier que multer est disponible
    let multer;
    try {
        multer = require('multer');
    } catch {
        return res.status(503).json({
            message: 'Upload indisponible. Installez les dépendances : npm install multer @supabase/supabase-js',
        });
    }

    // 2. Vérifier que les variables Supabase sont présentes
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        return res.status(503).json({
            message: 'Upload indisponible. Ajoutez SUPABASE_URL et SUPABASE_SERVICE_KEY dans le .env',
        });
    }

    // 3. Parser le fichier avec multer en mémoire
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_r, file, cb) => {
            const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            ALLOWED.includes(file.mimetype)
                ? cb(null, true)
                : cb(new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.'));
        },
    }).single('avatar');

    // Wrapping multer dans une promesse pour pouvoir utiliser async/await
    await new Promise((resolve, reject) => upload(req, res, (err) => (err ? reject(err) : resolve())));

    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const user_id = req.user.user_id;

    try {
        // 4. Initialiser le client Supabase (uniquement à ce stade)
        const { createClient } = require('@supabase/supabase-js');
        const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        const ext      = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filePath = `${user_id}/avatar_${Date.now()}${ext}`;

        // 5. Upload vers le bucket "avatars" (doit être public dans Supabase)
        const { error: uploadError } = await client.storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = client.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 6. Persister l'URL en base
        const { rows } = await db.query(
            `UPDATE users SET avatar = $1
             WHERE user_id = $2
             RETURNING user_id, username, avatar, bio`,
            [publicUrl, user_id]
        );

        return res.json(rows[0]);
    } catch (err) {
        console.error('[uploadAvatar]', err.message);
        return res.status(500).json({ message: "Erreur lors de l'upload.", error: err.message });
    }
};

// ── DELETE /api/users/me  (authentifié — RGPD) ───────────────────────────────
const deleteAccount = async (req, res) => {
    const user_id = req.user.user_id;

    try {
        await db.query('DELETE FROM users WHERE user_id = $1', [user_id]);
        return res.json({ message: 'Compte supprimé.' });
    } catch (err) {
        console.error('[deleteAccount]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

module.exports = {
    getProfile,
    getProfileStats,
    updateProfile,
    uploadAvatar,
    deleteAccount,
};
