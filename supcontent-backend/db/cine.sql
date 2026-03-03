CREATE DATABASE IF NOT EXISTS cine_db;
USE cine_db;

-- 1. USERS
CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('local','google','github','facebook') NOT NULL DEFAULT 'local',
    provider_id VARCHAR(255),
    email VARCHAR(255),
    username VARCHAR(50),
    password VARCHAR(255),
    avatar VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email, provider)
);

-- =================================
-- 2. FOLLOWS
-- =================================
CREATE TABLE follows (
    follower_id INT NOT NULL,
    followee_id INT NOT NULL,
    PRIMARY KEY (follower_id, followee_id),

    CONSTRAINT FK_follows_follower
        FOREIGN KEY (follower_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_follows_followee
        FOREIGN KEY (followee_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- 3. MEDIA_CACHE
CREATE TABLE media_cache (
    external_id BIGINT NOT NULL PRIMARY KEY,
    media_type  ENUM('Movie','Series') NOT NULL,
    full_data   JSON,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =================================
-- 4. REVIEWS
-- =================================
CREATE TABLE reviews (
    review_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    external_id BIGINT NOT NULL,
    rating TINYINT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT FK_reviews_media
        FOREIGN KEY (external_id)
        REFERENCES media_cache(external_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =================================
-- 5. COLLECTIONS
-- =================================
CREATE TABLE collections (
    collection_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    external_id BIGINT NOT NULL,
    status ENUM('À voir','En cours','Terminé','Abandonné') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_collections_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_collections_media
        FOREIGN KEY (external_id)
        REFERENCES media_cache(external_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =================================
-- 6. NOTIFICATIONS
-- =================================
CREATE TABLE notifications (
    notification_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('like','comment','follow') NOT NULL,
    source_user_id INT,
    media_id BIGINT,
    review_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_notifications_source_user
        FOREIGN KEY (source_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT FK_notifications_media
        FOREIGN KEY (media_id)
        REFERENCES media_cache(external_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_notifications_review
        FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =================================
-- 7. MESSAGES
-- =================================
CREATE TABLE messages (
    message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_messages_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =================================
-- 8. ACTIVITY_LOG
-- =================================
CREATE TABLE activity_log (
    activity_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('review','collection_add','follow','like') NOT NULL,
    target_user_id INT,
    media_id BIGINT,
    review_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_activity_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_activity_target_user
        FOREIGN KEY (target_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT FK_activity_media
        FOREIGN KEY (media_id)
        REFERENCES media_cache(external_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_activity_review
        FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =================================
-- 9. MODERATION
-- =================================
CREATE TABLE moderation_reports (
    report_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(255),
    status ENUM('pending','resolved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_reports_review
        FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_reports_user
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

CREATE TABLE highlighted_reviews (
    highlight_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_highlight_review
        FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);
