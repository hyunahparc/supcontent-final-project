-- PostgreSQL schema for SUPCONTENT

-- 1. USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    provider VARCHAR(20) NOT NULL DEFAULT 'local',
    provider_id VARCHAR(255),
    email VARCHAR(255),
    username VARCHAR(50),
    password VARCHAR(255),
    avatar VARCHAR(255),
    bio TEXT,
    link VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (email, provider)
);

-- 1a. OAUTH_CODES
CREATE TABLE oauth_codes (
    oauth_code_id SERIAL PRIMARY KEY,
    code_hash CHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_codes_expires_at
ON oauth_codes(expires_at);

-- 1b. REFRESH_TOKENS
CREATE TABLE refresh_tokens (
    refresh_token_id SERIAL PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

-- 2. FOLLOWS
CREATE TABLE follows (
    follower_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    followee_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followee_id)
);

-- 3. MEDIA_CACHE
CREATE TABLE media_cache (
    external_id BIGINT NOT NULL,
    media_type VARCHAR(10) NOT NULL DEFAULT 'Movie',
    full_data JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (external_id, media_type),
    CHECK (media_type IN ('Movie', 'Series'))
);

-- 4. REVIEWS
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    external_id BIGINT NOT NULL,
    media_type VARCHAR(10) NOT NULL DEFAULT 'Movie',
    rating NUMERIC(2,1),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_media_fkey FOREIGN KEY (external_id, media_type)
        REFERENCES media_cache(external_id, media_type) ON DELETE CASCADE,
    CONSTRAINT reviews_user_media_unique UNIQUE (user_id, external_id, media_type),
    CHECK (media_type IN ('Movie', 'Series'))
);

-- 4a. REVIEW_LIKES
CREATE TABLE review_likes (
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (review_id, user_id)
);

-- 4b. REVIEW_COMMENTS
CREATE TABLE review_comments (
    comment_id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CUSTOM_LISTS
CREATE TABLE custom_lists (
    list_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5a. CUSTOM_LIST_ITEMS
CREATE TABLE custom_list_items (
    list_id INT NOT NULL REFERENCES custom_lists(list_id) ON DELETE CASCADE,
    external_id BIGINT NOT NULL,
    media_type VARCHAR(10) NOT NULL DEFAULT 'Movie',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (list_id, external_id, media_type),
    CONSTRAINT custom_list_items_media_fkey FOREIGN KEY (external_id, media_type)
        REFERENCES media_cache(external_id, media_type) ON DELETE CASCADE,
    CHECK (media_type IN ('Movie', 'Series'))
);

-- 6. COLLECTIONS
CREATE TABLE collections (
    collection_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    external_id BIGINT NOT NULL,
    media_type VARCHAR(10) NOT NULL DEFAULT 'Movie',
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT collections_media_fkey FOREIGN KEY (external_id, media_type)
        REFERENCES media_cache(external_id, media_type) ON DELETE CASCADE,
    CONSTRAINT collections_user_media_unique UNIQUE (user_id, external_id, media_type),
    CHECK (media_type IN ('Movie', 'Series'))
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    source_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    media_id BIGINT,
    media_type VARCHAR(10),
    review_id INT REFERENCES reviews(review_id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_media_fkey FOREIGN KEY (media_id, media_type)
        REFERENCES media_cache(external_id, media_type) ON DELETE CASCADE,
    CHECK (media_type IS NULL OR media_type IN ('Movie', 'Series'))
);

-- 8. MESSAGES
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_receiver_created
ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX idx_messages_receiver_sender_created
ON messages(receiver_id, sender_id, created_at DESC);

CREATE INDEX idx_messages_receiver_unread
ON messages(receiver_id, read_at)
WHERE read_at IS NULL;

-- 9. ACTIVITY_LOG
CREATE TABLE activity_log (
    activity_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL,
    target_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    media_id BIGINT,
    media_type VARCHAR(10),
    review_id INT REFERENCES reviews(review_id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activity_log_media_fkey FOREIGN KEY (media_id, media_type)
        REFERENCES media_cache(external_id, media_type) ON DELETE CASCADE,
    CHECK (media_type IS NULL OR media_type IN ('Movie', 'Series'))
);

-- 10. MODERATION
CREATE TABLE moderation_reports (
    report_id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    reporter_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_reports_unique UNIQUE (review_id, reporter_id)
);

-- 11. HIGHLIGHTED_REVIEWS
CREATE TABLE highlighted_reviews (
    highlight_id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT highlighted_reviews_unique UNIQUE (review_id)
);
