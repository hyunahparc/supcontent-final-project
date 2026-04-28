const db = require('../config/db');

const createList = async(req, res) => {
    const { name, is_public } = req.body;
    const user_id = req.user.user_id;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'List name is required.' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO custom_lists (user_id, name, is_public) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [user_id, name.trim(), is_public ?? true]
        );

        return res.status(201).json(rows[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getLists = async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const { rows } = await db.query(
            `SELECT cl.*,
                    COUNT(cli.external_id)::int AS films_count,
                    ARRAY(
                        SELECT m.full_data->>'poster_path'
                        FROM custom_list_items i
                        JOIN media_cache m ON m.external_id = i.external_id
                        WHERE i.list_id = cl.list_id
                          AND m.full_data->>'poster_path' IS NOT NULL
                        ORDER BY i.added_at DESC
                        LIMIT 4
                    ) AS preview_posters
             FROM custom_lists cl
             LEFT JOIN custom_list_items cli ON cli.list_id = cl.list_id
             WHERE cl.user_id = $1
             GROUP BY cl.list_id
             ORDER BY cl.created_at DESC`,
            [user_id]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getListById = async (req, res) => {
    const { id } = req.params;
    const viewer_id = req.user?.user_id ?? null;

    try {
        // Get list info
        const { rows: listRows } = await db.query(
            `SELECT * FROM custom_lists WHERE list_id = $1`,
            [id]
        );

        if (!listRows[0]) {
            return res.status(404).json({ message: 'List not found.' });
        }

        const list = listRows[0];

        // Private list — only owner can view
        if (!list.is_public && list.user_id !== viewer_id) {
            return res.status(403).json({ message: 'This list is private.' });
        }

        // Get films in the list
        const { rows: films } = await db.query(
            `SELECT cli.added_at, m.external_id, m.media_type, m.full_data
             FROM custom_list_items cli
             JOIN media_cache m ON m.external_id = cli.external_id
             WHERE cli.list_id = $1
             ORDER BY cli.added_at DESC`,
            [id]
        );

        return res.json({ ...list, films });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateList = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const { name, is_public } = req.body;

    if (name !== undefined && !name.trim()) {
        return res.status(400).json({ message: 'List name cannot be empty.' });
    }

    try {
        const { rows } = await db.query(
            `UPDATE custom_lists
             SET name      = COALESCE($1, name),
                 is_public = COALESCE($2, is_public),
                 updated_at = NOW()
             WHERE list_id = $3 AND user_id = $4
             RETURNING *`,
            [name?.trim() ?? null, is_public ?? null, id, user_id]
        );

        if (!rows[0]) {
            return res.status(404).json({ message: 'List not found or not yours.' });
        }

        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteList = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM custom_lists WHERE list_id = $1 AND user_id = $2',
            [id, user_id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: 'List not found or not yours.' });
        }

        return res.json({ message: 'List deleted.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const addFilmToList = async (req, res) => {
    const { id } = req.params;
    const { external_id } = req.body;
    const user_id = req.user.user_id;

    if (!external_id) {
        return res.status(400).json({ message: 'external_id is required.' });
    }

    try {
        // Check that the list belongs to the user
        const { rows: listRows } = await db.query(
            'SELECT list_id FROM custom_lists WHERE list_id = $1 AND user_id = $2',
            [id, user_id]
        );

        if (!listRows[0]) {
            return res.status(404).json({ message: 'List not found or not yours.' });
        }

        const { rows } = await db.query(
            `INSERT INTO custom_list_items (list_id, external_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [id, external_id]
        );

        return res.status(201).json(rows[0] ?? { message: 'Already in list.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const removeFilmFromList = async (req, res) => {
    const { id, external_id } = req.params;
    const user_id = req.user.user_id;

    try {
        // Check that the list belongs to the user
        const { rows: listRows } = await db.query(
            'SELECT list_id FROM custom_lists WHERE list_id = $1 AND user_id = $2',
            [id, user_id]
        );

        if (!listRows[0]) {
            return res.status(404).json({ message: 'List not found or not yours.' });
        }

        const { rowCount } = await db.query(
            'DELETE FROM custom_list_items WHERE list_id = $1 AND external_id = $2',
            [id, external_id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Film not found in list.' });
        }

        return res.json({ message: 'Film removed from list.' });
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/users/:id/lists  (public — only returns public lists)
const getUserPublicLists = async (req, res) => {
    const { id } = req.params;

    if (isNaN(Number(id))) return res.status(400).json({ message: 'Invalid id.' });

    try {
        const { rows } = await db.query(
            `SELECT cl.*,
                    COUNT(cli.external_id)::int AS films_count,
                    ARRAY(
                        SELECT m.full_data->>'poster_path'
                        FROM custom_list_items i
                        JOIN media_cache m ON m.external_id = i.external_id
                        WHERE i.list_id = cl.list_id
                          AND m.full_data->>'poster_path' IS NOT NULL
                        ORDER BY i.added_at DESC
                        LIMIT 4
                    ) AS preview_posters
             FROM custom_lists cl
             LEFT JOIN custom_list_items cli ON cli.list_id = cl.list_id
             WHERE cl.user_id = $1
               AND cl.is_public = true
             GROUP BY cl.list_id
             ORDER BY cl.created_at DESC`,
            [id]
        );
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { createList, getLists, getUserPublicLists, getListById, updateList, deleteList, addFilmToList, removeFilmFromList };

