const db = require('../config/db');

const MAX_MESSAGE_LENGTH = 1000;

async function isMutualFollow(userId, otherUserId) {
    const { rows } = await db.query(
        `SELECT EXISTS (
            SELECT 1
            FROM follows f1
            JOIN follows f2
              ON f2.follower_id = f1.followee_id
             AND f2.followee_id = f1.follower_id
            WHERE f1.follower_id = $1
              AND f1.followee_id = $2
        ) AS can_chat`,
        [userId, otherUserId]
    );

    return rows[0]?.can_chat === true;
}

// GET /api/messages/conversations
const getConversations = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const { rows } = await db.query(
            `WITH message_contacts AS (
                SELECT CASE
                    WHEN sender_id = $1 THEN receiver_id
                    ELSE sender_id
                END AS user_id
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
            ),
            mutual_contacts AS (
                SELECT mine.followee_id AS user_id
                FROM follows mine
                JOIN follows theirs
                  ON theirs.follower_id = mine.followee_id
                 AND theirs.followee_id = mine.follower_id
                WHERE mine.follower_id = $1
            ),
            contacts AS (
                SELECT user_id FROM message_contacts
                UNION
                SELECT user_id FROM mutual_contacts
            )
            SELECT
                u.user_id,
                u.username,
                u.avatar,
                EXISTS (
                    SELECT 1
                    FROM mutual_contacts mc
                    WHERE mc.user_id = u.user_id
                ) AS can_chat,
                lm.message_id AS last_message_id,
                lm.content    AS last_message,
                lm.sender_id  AS last_sender_id,
                lm.created_at AS last_message_at,
                COALESCE(unread.count, 0)::int AS unread_count
            FROM contacts c
            JOIN users u ON u.user_id = c.user_id
            LEFT JOIN LATERAL (
                SELECT message_id, sender_id, content, created_at
                FROM messages
                WHERE (sender_id = $1 AND receiver_id = u.user_id)
                   OR (sender_id = u.user_id AND receiver_id = $1)
                ORDER BY created_at DESC
                LIMIT 1
            ) lm ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS count
                FROM messages
                WHERE sender_id = u.user_id
                  AND receiver_id = $1
                  AND read_at IS NULL
            ) unread ON true
            ORDER BY lm.created_at DESC NULLS LAST, u.username ASC`,
            [userId]
        );

        return res.json(rows);
    } catch (err) {
        console.error('[getConversations]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/messages/:userId
const getMessagesWithUser = async (req, res) => {
    const userId = req.user.user_id;
    const otherUserId = Number(req.params.userId);

    if (Number.isNaN(otherUserId)) {
        return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (userId === otherUserId) {
        return res.status(400).json({ message: 'You cannot chat with yourself.' });
    }

    try {
        const canChat = await isMutualFollow(userId, otherUserId);

        await db.query(
            `UPDATE messages
             SET read_at = NOW()
             WHERE sender_id = $1
               AND receiver_id = $2
               AND read_at IS NULL`,
            [otherUserId, userId]
        );

        const { rows } = await db.query(
            `SELECT
                m.message_id,
                m.sender_id,
                m.receiver_id,
                m.content,
                m.created_at,
                m.read_at,
                sender.username AS sender_username,
                sender.avatar   AS sender_avatar
             FROM messages m
             JOIN users sender ON sender.user_id = m.sender_id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2)
                OR (m.sender_id = $2 AND m.receiver_id = $1)
             ORDER BY m.created_at ASC
             LIMIT 200`,
            [userId, otherUserId]
        );

        return res.json({ can_chat: canChat, messages: rows });
    } catch (err) {
        console.error('[getMessagesWithUser]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// POST /api/messages/:userId
const sendMessage = async (req, res) => {
    const senderId = req.user.user_id;
    const receiverId = Number(req.params.userId);
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (Number.isNaN(receiverId)) {
        return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (senderId === receiverId) {
        return res.status(400).json({ message: 'You cannot chat with yourself.' });
    }

    if (!content) {
        return res.status(400).json({ message: 'Message cannot be empty.' });
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` });
    }

    try {
        const canChat = await isMutualFollow(senderId, receiverId);
        if (!canChat) {
            return res.status(403).json({ message: 'You can only message mutual followers.' });
        }

        const { rows } = await db.query(
            `INSERT INTO messages (sender_id, receiver_id, content)
             VALUES ($1, $2, $3)
             RETURNING message_id, sender_id, receiver_id, content, created_at, read_at`,
            [senderId, receiverId, content]
        );

        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[sendMessage]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET /api/messages/unread-count
const getUnreadMessageCount = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const { rows } = await db.query(
            `SELECT COUNT(*)::int AS count
             FROM messages
             WHERE receiver_id = $1
               AND read_at IS NULL`,
            [userId]
        );

        return res.json({ count: rows[0].count });
    } catch (err) {
        console.error('[getUnreadMessageCount]', err.message);
        return res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getConversations,
    getUnreadMessageCount,
    getMessagesWithUser,
    sendMessage,
};
