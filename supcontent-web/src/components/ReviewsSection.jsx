import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    getReviews,
    getMyReview,
    upsertReview,
    deleteReview,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
    reportReview,
} from '../api/reviews';
import { ChevronIcon, MessageCircleIcon, StarIcon } from './AppIcons';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

// --- Star Rating Component (whole stars, 1–5) ---
function StarRating({ value, onChange, readOnly = false, size = 20 }) {
    const [hovered, setHovered] = useState(0);

    // Round any legacy half values to the nearest whole star for display.
    const display = hovered || Math.round(value || 0);

    return (
        <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(n => {
                const filled = display >= n;
                return (
                    <div
                        key={n}
                        onMouseEnter={() => !readOnly && setHovered(n)}
                        onMouseLeave={() => !readOnly && setHovered(0)}
                        onClick={() => !readOnly && onChange && onChange(n)}
                        style={{
                            width: size,
                            height: size,
                            lineHeight: 0,
                            cursor: readOnly ? 'default' : 'pointer',
                            userSelect: 'none',
                            flexShrink: 0,
                        }}
                    >
                        <StarIcon
                            size={size}
                            filled={filled}
                            style={{ display: 'block', color: filled ? '#f5c518' : 'var(--text-muted)' }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

// --- Single Review Card ---
function ReviewCard({ review, currentUserId, onLike, onDelete, onEdit, onReport, onCommentAdded, onCommentDeleted }) {
    const { t, language } = useLanguage();
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [reporting, setReporting] = useState(false);

    async function handleToggleComments() {
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            try {
                const data = await getComments(review.review_id);
                setComments(data);
            } finally {
                setLoadingComments(false);
            }
        }
        setShowComments(v => !v);
    }

    async function handleAddComment(e) {
        e.preventDefault();
        if (!commentInput.trim()) return;
        const newComment = await addComment(review.review_id, commentInput.trim());
        setComments(prev => [...prev, newComment]);
        setCommentInput('');
        onCommentAdded(review.review_id);
    }

    async function handleDeleteComment(commentId) {
        await deleteComment(review.review_id, commentId);
        setComments(prev => prev.filter(c => c.comment_id !== commentId));
        onCommentDeleted(review.review_id);
    }

    async function handleReport() {
        if (!onReport || reporting) return;
        setReporting(true);
        try {
            await onReport(review.review_id);
        } finally {
            setReporting(false);
        }
    }

    const isOwner = currentUserId === review.user_id;

    return (
        <div style={{ ...cardStyles.card, position: 'relative' }}>
            <div style={cardStyles.header}>
                <Link to={`/users/${review.user_id}/profile`} style={{ ...cardStyles.avatar, textDecoration: 'none' }} aria-label={review.username}>
                    {review.avatar
                        ? <img src={review.avatar} alt={review.username} style={cardStyles.avatarImg} referrerPolicy="no-referrer" />
                        : <span style={cardStyles.avatarFallback}>{review.username?.charAt(0).toUpperCase()}</span>
                    }
                </Link>
                <div style={{ flex: 1 }}>
                    <Link to={`/users/${review.user_id}/profile`} style={{ ...cardStyles.username, textDecoration: 'none' }}>{review.username}</Link>
                    <div style={cardStyles.date}>
                        {new Date(review.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {review.updated_at !== review.created_at && ' (edited)'}
                    </div>
                </div>
                {isOwner && (
                    <div style={cardStyles.ownerActions}>
                        <button onClick={onEdit} style={cardStyles.ownerBtn}>{t('review_edit')}</button>
                        <button onClick={() => onDelete(review.review_id)} style={{ ...cardStyles.ownerBtn, color: '#f3727f' }}>{t('review_delete')}</button>
                    </div>
                )}
            </div>

            {review.rating && (
                <div style={{ marginBottom: '10px' }}>
                    <StarRating value={parseFloat(review.rating)} readOnly size={22} />
                </div>
            )}

            {review.comment && <p style={cardStyles.comment}>{review.comment}</p>}

            <div style={cardStyles.actions}>
                {currentUserId && (
                    <button
                        onClick={() => onLike(review.review_id)}
                        style={{ ...cardStyles.actionBtn, color: review.liked_by_me ? 'var(--accent)' : 'var(--text-secondary)' }}
                    >
                        ♥ {review.likes_count}
                    </button>
                )}
                {!currentUserId && review.likes_count > 0 && (
                    <span style={{ ...cardStyles.actionBtn, cursor: 'default', color: 'var(--text-secondary)' }}>
                        ♥ {review.likes_count}
                    </span>
                )}
                <button onClick={handleToggleComments} style={cardStyles.actionBtn}>
                    <MessageCircleIcon size={15} />
                    {review.comments_count}
                    <ChevronIcon direction={showComments ? 'up' : 'down'} size={13} />
                </button>
                {currentUserId && !isOwner && (
                    <button
                        onClick={handleReport}
                        disabled={reporting}
                        style={{ ...cardStyles.actionBtn, color: '#f3727f', opacity: reporting ? 0.65 : 1 }}
                    >
                        {reporting ? t('review_reporting') : t('review_report')}
                    </button>
                )}
            </div>

            {showComments && (
                <div style={cardStyles.commentsBox}>
                    {loadingComments && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('review_loading_comments')}</p>}
                    {comments.map(c => (
                        <div key={c.comment_id} style={cardStyles.commentRow}>
                            <Link to={`/users/${c.user_id}/profile`} style={cardStyles.commentAvatarLink} aria-label={c.username}>
                                {c.avatar ? (
                                    <img src={c.avatar} alt={c.username} style={cardStyles.commentAvatar} referrerPolicy="no-referrer" />
                                ) : (
                                    <span style={cardStyles.commentAvatarFallback}>{c.username?.charAt(0).toUpperCase()}</span>
                                )}
                            </Link>
                            <span style={cardStyles.commentUser}>{c.username}</span>
                            <span style={cardStyles.commentText}>{c.content}</span>
                            {currentUserId === c.user_id && (
                                <button onClick={() => handleDeleteComment(c.comment_id)} style={cardStyles.commentDelete}>×</button>
                            )}
                        </div>
                    ))}
                    {currentUserId && (
                        <form onSubmit={handleAddComment} style={cardStyles.commentForm}>
                            <input
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                placeholder={t('review_add_comment')}
                                style={cardStyles.commentInput}
                            />
                            <button type="submit" style={cardStyles.commentSubmit}>{t('review_send')}</button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Main ReviewsSection ---
export default function ReviewsSection({ externalId, mediaType = 'Movie' }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [reviews, setReviews] = useState([]);
    const [myReview, setMyReview] = useState(null);

    // Write/edit form state
    const [formRating, setFormRating] = useState(0);
    const [formComment, setFormComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const fetchReviews = useCallback(() => {
        getReviews(externalId, mediaType).then(setReviews).catch(() => setReviews([]));
    }, [externalId, mediaType]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    // Pre-fill form if user already has a review
    useEffect(() => {
        if (!user) { setMyReview(null); return; }
        getMyReview(externalId, mediaType).then(r => {
            setMyReview(r);
            if (r) { setFormRating(r.rating ?? 0); setFormComment(r.comment ?? ''); }
        });
    }, [externalId, mediaType, user]);

    async function handleSubmitReview(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await upsertReview(externalId, mediaType, formRating || null, formComment || null);
            setShowForm(false);
            fetchReviews();
            const updated = await getMyReview(externalId, mediaType);
            setMyReview(updated);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteReview(reviewId) {
        await deleteReview(reviewId);
        setMyReview(null);
        setFormRating(0);
        setFormComment('');
        fetchReviews();
    }

    async function handleLike(reviewId) {
        const { liked } = await toggleLike(reviewId);
        setReviews(prev => prev.map(r =>
            r.review_id === reviewId
                ? { ...r, liked_by_me: liked, likes_count: r.likes_count + (liked ? 1 : -1) }
                : r
        ));
    }

    async function handleReportReview(reviewId) {
        const reason = window.prompt(t('review_report_reason'));
        if (reason === null) return;

        try {
            await reportReview(reviewId, reason);
            window.alert(t('review_report_success'));
        } catch (err) {
            window.alert(err.response?.data?.message || t('review_error_report'));
        }
    }

    // Update comment counts in the list after add/delete
    function adjustCommentCount(reviewId, delta) {
        setReviews(prev => prev.map(r =>
            r.review_id === reviewId
                ? { ...r, comments_count: r.comments_count + delta }
                : r
        ));
    }

    // Average rating from community reviews
    const ratedReviews = reviews.filter(r => r.rating);
    const avgRating = ratedReviews.length
        ? (ratedReviews.reduce((s, r) => s + parseFloat(r.rating), 0) / ratedReviews.length).toFixed(1)
        : null;

    return (
        <section style={sectionStyles.section}>
            <div style={sectionStyles.header}>
                <h2 style={sectionStyles.title}>{t('review_title')}</h2>
                {avgRating && (
                    <div style={sectionStyles.avg}>
                        <StarRating value={Math.round(parseFloat(avgRating))} readOnly size={18} />
                        <span style={sectionStyles.avgText}>{avgRating} / 5</span>
                        <span style={sectionStyles.dim}>({ratedReviews.length} {t('review_ratings')})</span>
                    </div>
                )}
            </div>

            {/* Write / Edit review — logged-in only */}
            {user && (
                <div style={sectionStyles.writeBox}>
                    {!showForm && !myReview && (
                        <button onClick={() => setShowForm(true)} style={sectionStyles.writeBtn}>
                            {t('review_write')}
                        </button>
                    )}
                    {!showForm && myReview && (
                        <button onClick={() => setShowForm(true)} style={sectionStyles.writeBtn}>
                            {t('review_edit')}
                        </button>
                    )}
                    {showForm && (
                        <form onSubmit={handleSubmitReview} style={sectionStyles.form}>
                            <StarRating value={formRating} onChange={setFormRating} size={28} />
                            <textarea
                                value={formComment}
                                onChange={e => setFormComment(e.target.value)}
                                placeholder={t('review_placeholder')}
                                rows={4}
                                style={sectionStyles.textarea}
                            />
                            <div style={sectionStyles.formActions}>
                                <button type="submit" disabled={submitting || (!formRating && !formComment)} style={sectionStyles.submitBtn}>
                                    {submitting ? t('review_saving') : myReview ? t('review_update') : t('review_post')}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} style={sectionStyles.cancelBtn}>
                                    {t('review_cancel')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
            {!user && (
                <div style={sectionStyles.loginPrompt}>
                    {t('review_login')}
                </div>
            )}

            {/* Review list */}
            {user && reviews.length === 0 && (
                <p style={sectionStyles.dim}>{t('review_empty')}</p>
            )}
            {reviews.map(review => (
                <ReviewCard
                    key={review.review_id}
                    review={review}
                    currentUserId={user?.user_id}
                    onLike={handleLike}
                    onDelete={handleDeleteReview}
                    onEdit={() => setShowForm(true)}
                    onReport={handleReportReview}
                    onCommentAdded={(id) => adjustCommentCount(id, +1)}
                    onCommentDeleted={(id) => adjustCommentCount(id, -1)}
                />
            ))}
        </section>
    );
}

const sectionStyles = {
    section: {
        maxWidth: '1200px',
        margin: '48px auto 0',
        padding: '0 clamp(20px, 5vw, 40px)',
        fontFamily: font,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    avg: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    avgText: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#f5c518',
    },
    dim: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
    },
    writeBox: {
        marginBottom: '28px',
    },
    loginPrompt: {
        marginBottom: '28px',
        color: 'var(--text-secondary)',
        fontSize: '14px',
    },
    writeBtn: {
        padding: '10px 22px',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
        letterSpacing: '0.5px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: 'var(--bg-elevated)',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%',
    },
    formActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    textarea: {
        padding: '12px 14px',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-visible)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontFamily: font,
        resize: 'vertical',
        outline: 'none',
    },
    submitBtn: {
        padding: '10px 22px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
        minHeight: '40px',
    },
    cancelBtn: {
        padding: '10px 22px',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: font,
        minHeight: '40px',
    },
};

const cardStyles = {
    card: {
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
        fontFamily: font,
    },
    ownerActions: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        flexWrap: 'wrap',
        marginLeft: 'auto',
    },
    ownerBtn: {
        background: 'none',
        border: 'none',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontFamily: font,
        padding: '2px 4px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
        minWidth: 0,
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    avatarFallback: {
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    username: {
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    date: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        marginTop: '2px',
    },
    comment: {
        fontSize: '14px',
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        margin: '0 0 14px',
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        padding: 0,
        fontFamily: font,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    commentsBox: {
        marginTop: '16px',
        borderTop: '1px solid var(--border)',
        paddingTop: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    commentRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        minWidth: 0,
    },
    commentAvatarLink: {
        flexShrink: 0,
        display: 'block',
        textDecoration: 'none',
        lineHeight: 0,
    },
    commentAvatar: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
    },
    commentAvatarFallback: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    commentUser: {
        fontWeight: '700',
        color: 'var(--text-primary)',
        flexShrink: 0,
    },
    commentText: {
        color: 'var(--text-secondary)',
        flex: 1,
        lineHeight: 1.5,
        overflowWrap: 'anywhere',
    },
    commentDelete: {
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '0 4px',
        fontFamily: font,
        flexShrink: 0,
    },
    commentForm: {
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
        flexWrap: 'wrap',
    },
    commentInput: {
        flex: 1,
        minWidth: 'min(220px, 100%)',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontFamily: font,
        outline: 'none',
    },
    commentSubmit: {
        padding: '8px 16px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
        minHeight: '38px',
    },
};
