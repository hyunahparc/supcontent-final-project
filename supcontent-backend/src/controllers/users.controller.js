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
                u.link,
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
const getProfileStats = async (req, res) => {
    const { id } = req.params;

    if (isNaN(Number(id))) {
        return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    try {
        const [collectionResult, reviewResult, listsResult] = await Promise.all([
            // Counts by status, by media type, and cumulative runtime for completed movies
            db.query(
                `SELECT
                    COUNT(*) FILTER (WHERE c.status = 'To Watch')::int    AS to_watch,
                    COUNT(*) FILTER (WHERE c.status = 'Watching')::int    AS watching,
                    COUNT(*) FILTER (WHERE c.status = 'Completed')::int   AS completed,
                    COUNT(*) FILTER (WHERE c.status = 'Dropped')::int     AS dropped,
                    COUNT(*)::int                                           AS total,
                    COUNT(*) FILTER (WHERE c.media_type = 'Movie')::int   AS movies_count,
                    COUNT(*) FILTER (WHERE c.media_type = 'Series')::int  AS series_count,
                    COALESCE(SUM(
                        CASE WHEN c.status = 'Completed' AND c.media_type = 'Movie'
                            THEN COALESCE((m.full_data->>'runtime')::int, 0)
                            ELSE 0
                        END
                    ), 0)::int AS total_runtime_minutes
                 FROM collections c
                 LEFT JOIN media_cache m
                   ON m.external_id = c.external_id
                  AND m.media_type  = c.media_type
                 WHERE c.user_id = $1`,
                [id]
            ),
            // Average rating and review count
            db.query(
                `SELECT
                    COUNT(*)::int                        AS reviews_count,
                    ROUND(AVG(rating)::numeric, 1)::float AS avg_rating
                 FROM reviews
                 WHERE user_id = $1`,
                [id]
            ),
            // Custom lists count
            db.query(
                `SELECT COUNT(*)::int AS lists_count
                 FROM custom_lists
                 WHERE user_id = $1`,
                [id]
            ),
        ]);

        const c = collectionResult.rows[0];
        const r = reviewResult.rows[0];
        const l = listsResult.rows[0];

        return res.json({
            by_status: {
                'To Watch':  c.to_watch,
                'Watching':  c.watching,
                'Completed': c.completed,
                'Dropped':   c.dropped,
            },
            total:                 c.total,
            movies_count:          c.movies_count,
            series_count:          c.series_count,
            total_runtime_minutes: c.total_runtime_minutes,
            reviews_count:         r.reviews_count,
            avg_rating:            r.avg_rating ?? null,
            lists_count:           l.lists_count,
        });
    } catch (err) {
        console.error('[getProfileStats]', err.message);
        return res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
};

// ── PUT /api/users/me/profile  (authentifié) ─────────────────────────────────
const updateProfile = async (req, res) => {
    const user_id = req.user.user_id;
    const { username, bio, link } = req.body;

    if (username !== undefined) {
        const trimmed = (username || '').trim();
        if (trimmed.length < 3 || trimmed.length > 50) {
            return res.status(400).json({ message: 'Username must be between 3 and 50 characters.' });
        }
    }

    if (bio !== undefined && bio.length > 500) {
        return res.status(400).json({ message: 'Bio cannot exceed 500 characters.' });
    }

    if (link !== undefined && link !== null && link !== '') {
        try {
            new URL(link);
        } catch {
            return res.status(400).json({ message: 'Invalid URL format.' });
        }
    }

    try {
        const { rows } = await db.query(
            `UPDATE users
             SET username = COALESCE($1, username),
                 bio      = COALESCE($2, bio),
                 link     = COALESCE($3, link)
             WHERE user_id = $4
             RETURNING user_id, username, avatar, bio, link`,
            [username?.trim() ?? null, bio ?? null, link ?? null, user_id]
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

// ── PUT /api/users/me/language  (authentifié) ────────────────────────────────
const updateLanguage = async (req, res) => {
    const user_id = req.user.user_id;
    const { language } = req.body;

    const SUPPORTED = ['fr', 'en'];
    if (!SUPPORTED.includes(language)) {
        return res.status(400).json({ message: 'Unsupported language. Supported: fr, en.' });
    }

    try {
        const { rows } = await db.query(
            `UPDATE users SET preferred_language = $1
             WHERE user_id = $2
             RETURNING user_id, preferred_language`,
            [language, user_id]
        );
        return res.json(rows[0]);
    } catch (err) {
        console.error('[updateLanguage]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ── GET /api/users/me/export?format=csv|json  (authentifié — RGPD) ───────────
const exportData = async (req, res) => {
    const user_id = req.user.user_id;
    const format  = req.query.format === 'csv' ? 'csv' : 'json';

    try {
        const { rows } = await db.query(
            `SELECT
                m.full_data->>'title'        AS title,
                m.media_type,
                m.full_data->>'release_date' AS release_date,
                c.status,
                c.created_at                 AS added_at,
                r.rating,
                r.comment                    AS review,
                r.created_at                 AS reviewed_at
             FROM collections c
             JOIN media_cache m  ON m.external_id = c.external_id
             LEFT JOIN reviews r ON r.user_id = c.user_id AND r.external_id = c.external_id
             WHERE c.user_id = $1
             ORDER BY c.created_at DESC`,
            [user_id]
        );

        if (format === 'csv') {
            const esc = (v) => v == null ? '' : '"' + String(v).replace(/"/g, '""') + '"';
            const header = 'title,media_type,release_date,status,added_at,rating,review,reviewed_at\n';
            const body   = rows.map(r =>
                [r.title, r.media_type, r.release_date, r.status,
                 r.added_at, r.rating, r.review, r.reviewed_at].map(esc).join(',')
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="supcontent-export.csv"');
            return res.send(header + body);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="supcontent-export.json"');
        return res.json(rows);
    } catch (err) {
        console.error('[exportData]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
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
    updateLanguage,
    uploadAvatar,
    exportData,
    deleteAccount,
};
