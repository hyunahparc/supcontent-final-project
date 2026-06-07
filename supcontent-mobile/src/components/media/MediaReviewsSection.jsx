import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
    addComment,
    deleteComment,
    deleteReview,
    getComments,
    getMyReview,
    getReviews,
    toggleLike,
    upsertReview,
} from '../../api/reviews';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function MediaReviewsSection({ mediaId, mediaType }) {
    const { token, user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [myReview, setMyReview] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewSaving, setReviewSaving] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [openComments, setOpenComments] = useState({});
    const [reviewComments, setReviewComments] = useState({});
    const [commentInputs, setCommentInputs] = useState({});
    const [commentLoading, setCommentLoading] = useState({});
    const [commentSaving, setCommentSaving] = useState({});

    useEffect(() => {
        let cancelled = false;

        if (!mediaId || !token) {
            setMyReview(null);
            setReviewRating(0);
            setReviewComment('');
            return undefined;
        }

        getMyReview(mediaId, mediaType, token).then((data) => {
            if (cancelled) return;

            setMyReview(data);
            setReviewRating(data?.rating ? Number(data.rating) : 0);
            setReviewComment(data?.comment ?? '');
            setShowReviewForm(false);
        });

        return () => {
            cancelled = true;
        };
    }, [mediaId, mediaType, token]);

    useEffect(() => {
        let cancelled = false;

        if (!mediaId) return undefined;

        getReviews(mediaId, mediaType, token)
            .then((data) => {
                if (!cancelled) setReviews(data ?? []);
            })
            .catch(() => {
                if (!cancelled) setReviews([]);
            });

        return () => {
            cancelled = true;
        };
    }, [mediaId, mediaType, token]);

    async function handleSaveReview() {
        if (!token) {
            router.push('/login');
            return;
        }

        if (!reviewRating && !reviewComment.trim()) {
            setReviewError('Add a rating or write a review first.');
            return;
        }

        setReviewSaving(true);
        setReviewError('');

        try {
            const saved = await upsertReview(
                mediaId,
                mediaType,
                reviewRating || null,
                reviewComment.trim() || null,
                token
            );
            const nextReviews = await getReviews(mediaId, mediaType, token);

            setMyReview(saved);
            setReviews(nextReviews ?? []);
            setShowReviewForm(false);
        } catch (err) {
            setReviewError(err.message || 'Unable to save review.');
        } finally {
            setReviewSaving(false);
        }
    }

    async function handleToggleLike(reviewId) {
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const result = await toggleLike(reviewId, token);

            setReviews((current) => current.map((review) => {
                if (review.review_id !== reviewId) return review;

                const wasLiked = Boolean(review.liked_by_me);
                const isLiked = Boolean(result?.liked);
                const nextLikes = Math.max(
                    0,
                    Number(review.likes_count ?? 0) + (isLiked && !wasLiked ? 1 : !isLiked && wasLiked ? -1 : 0)
                );

                return {
                    ...review,
                    liked_by_me: isLiked,
                    likes_count: nextLikes,
                };
            }));
        } catch {
            setReviewError('Unable to update like.');
        }
    }

    async function handleToggleComments(reviewId) {
        const willOpen = !openComments[reviewId];

        setOpenComments((current) => ({ ...current, [reviewId]: willOpen }));

        if (!willOpen || reviewComments[reviewId]) return;

        setCommentLoading((current) => ({ ...current, [reviewId]: true }));

        try {
            const data = await getComments(reviewId);
            setReviewComments((current) => ({ ...current, [reviewId]: data ?? [] }));
        } finally {
            setCommentLoading((current) => ({ ...current, [reviewId]: false }));
        }
    }

    async function handleAddComment(reviewId) {
        if (!token) {
            router.push('/login');
            return;
        }

        const content = commentInputs[reviewId]?.trim();

        if (!content) return;

        setCommentSaving((current) => ({ ...current, [reviewId]: true }));

        try {
            const created = await addComment(reviewId, content, token);

            setReviewComments((current) => ({
                ...current,
                [reviewId]: [...(current[reviewId] ?? []), created],
            }));
            setCommentInputs((current) => ({ ...current, [reviewId]: '' }));
            setReviews((current) => current.map((review) => (
                review.review_id === reviewId
                    ? { ...review, comments_count: Number(review.comments_count ?? 0) + 1 }
                    : review
            )));
        } catch {
            setReviewError('Unable to add comment.');
        } finally {
            setCommentSaving((current) => ({ ...current, [reviewId]: false }));
        }
    }

    async function handleDeleteReview(reviewId) {
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            await deleteReview(reviewId, token);
            const nextReviews = await getReviews(mediaId, mediaType, token);

            setReviews(nextReviews ?? []);
            setMyReview(null);
            setReviewRating(0);
            setReviewComment('');
            setShowReviewForm(false);
            setReviewError('');
        } catch (err) {
            setReviewError(err.message || 'Unable to delete review.');
        }
    }

    async function handleDeleteComment(reviewId, commentId) {
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            await deleteComment(reviewId, commentId, token);

            setReviewComments((current) => ({
                ...current,
                [reviewId]: (current[reviewId] ?? []).filter((comment) => comment.comment_id !== commentId),
            }));
            setReviews((current) => current.map((review) => (
                review.review_id === reviewId
                    ? { ...review, comments_count: Math.max(0, Number(review.comments_count ?? 0) - 1) }
                    : review
            )));
            setReviewError('');
        } catch (err) {
            setReviewError(err.message || 'Unable to delete comment.');
        }
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Community Reviews</Text>

            {token ? (
                <>
                    <Pressable
                        onPress={() => {
                            setReviewError('');
                            setShowReviewForm((current) => !current);
                        }}
                        style={({ pressed }) => [styles.writeReviewButton, pressed && styles.pressed]}
                    >
                        <Ionicons name="create-outline" size={17} color={colors.accentText} />
                        <Text style={styles.writeReviewButtonText}>
                            {showReviewForm ? 'Close Review' : myReview ? 'Edit Review' : 'Write Review'}
                        </Text>
                    </Pressable>

                    {showReviewForm ? (
                        <View style={styles.reviewForm}>
                            <Text style={styles.reviewFormTitle}>{myReview ? 'Edit Your Review' : 'Write a Review'}</Text>

                            <View style={styles.ratingPicker}>
                                {[1, 2, 3, 4, 5].map((rating) => {
                                    const selected = reviewRating >= rating;

                                    return (
                                        <Pressable key={rating} onPress={() => setReviewRating(rating)} style={styles.ratingButton}>
                                            <Ionicons
                                                name={selected ? 'star' : 'star-outline'}
                                                size={24}
                                                color={selected ? '#f5c518' : colors.textMuted}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <TextInput
                                value={reviewComment}
                                onChangeText={setReviewComment}
                                placeholder="Share your thoughts..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                textAlignVertical="top"
                                style={styles.reviewInput}
                            />

                            {reviewError ? <Text style={styles.reviewError}>{reviewError}</Text> : null}

                            <Pressable
                                onPress={handleSaveReview}
                                disabled={reviewSaving}
                                style={({ pressed }) => [styles.reviewSubmit, (pressed || reviewSaving) && styles.pressed]}
                            >
                                <Text style={styles.reviewSubmitText}>{reviewSaving ? 'Saving...' : 'Save Review'}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </>
            ) : (
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.loginReviewBox, pressed && styles.pressed]}>
                    <Text style={styles.loginReviewText}>Log in to write your review.</Text>
                </Pressable>
            )}

            {reviews.length ? (
                <View style={styles.reviewList}>
                    {reviews.map((review) => (
                        <View key={review.review_id} style={styles.reviewBox}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.reviewAvatar}>
                                    <Text style={styles.reviewAvatarText}>{review.username?.charAt(0)?.toUpperCase()}</Text>
                                </View>
                                <View style={styles.reviewUser}>
                                    <Text style={styles.reviewName} numberOfLines={1}>{review.username}</Text>
                                    {review.rating ? (
                                        <View style={styles.reviewRating}>
                                            <Ionicons name="star" size={12} color="#f5c518" />
                                            <Text style={styles.reviewRatingText}>{Number(review.rating).toFixed(1)}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                {user?.user_id === review.user_id ? (
                                    <Pressable
                                        onPress={() => handleDeleteReview(review.review_id)}
                                        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                            {review.comment ? <Text style={styles.reviewText}>{review.comment}</Text> : null}

                            <View style={styles.reviewActions}>
                                <Pressable
                                    onPress={() => handleToggleLike(review.review_id)}
                                    style={({ pressed }) => [styles.reviewActionButton, pressed && styles.pressed]}
                                >
                                    <Ionicons
                                        name={review.liked_by_me ? 'heart' : 'heart-outline'}
                                        size={17}
                                        color={review.liked_by_me ? colors.accent : colors.textSecondary}
                                    />
                                    <Text style={[styles.reviewActionText, review.liked_by_me && styles.reviewActionTextActive]}>
                                        {review.likes_count ?? 0}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleToggleComments(review.review_id)}
                                    style={({ pressed }) => [styles.reviewActionButton, pressed && styles.pressed]}
                                >
                                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                                    <Text style={styles.reviewActionText}>
                                        {review.comments_count ?? 0}
                                    </Text>
                                </Pressable>
                            </View>

                            {openComments[review.review_id] ? (
                                <View style={styles.commentsBox}>
                                    {commentLoading[review.review_id] ? (
                                        <Text style={styles.commentState}>Loading comments...</Text>
                                    ) : null}

                                    {(reviewComments[review.review_id] ?? []).map((comment) => (
                                        <View key={comment.comment_id} style={styles.commentRow}>
                                            <View style={styles.commentAvatar}>
                                                <Text style={styles.commentAvatarText}>{comment.username?.charAt(0)?.toUpperCase()}</Text>
                                            </View>
                                            <View style={styles.commentContent}>
                                                <View style={styles.commentHeader}>
                                                    <Text style={styles.commentAuthor}>{comment.username}</Text>
                                                    {user?.user_id === comment.user_id ? (
                                                        <Pressable
                                                            onPress={() => handleDeleteComment(review.review_id, comment.comment_id)}
                                                            hitSlop={8}
                                                        >
                                                            <Text style={styles.commentDelete}>Delete</Text>
                                                        </Pressable>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.commentText}>{comment.content}</Text>
                                            </View>
                                        </View>
                                    ))}

                                    {!commentLoading[review.review_id] && !(reviewComments[review.review_id] ?? []).length ? (
                                        <Text style={styles.commentState}>No comments yet.</Text>
                                    ) : null}

                                    {token ? (
                                        <View style={styles.commentForm}>
                                            <TextInput
                                                value={commentInputs[review.review_id] ?? ''}
                                                onChangeText={(text) => setCommentInputs((current) => ({ ...current, [review.review_id]: text }))}
                                                placeholder="Add a comment..."
                                                placeholderTextColor={colors.textMuted}
                                                style={styles.commentInput}
                                            />
                                            <Pressable
                                                onPress={() => handleAddComment(review.review_id)}
                                                disabled={commentSaving[review.review_id]}
                                                style={({ pressed }) => [styles.commentSubmit, (pressed || commentSaving[review.review_id]) && styles.pressed]}
                                            >
                                                <Ionicons name="send" size={16} color={colors.accentText} />
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <Pressable onPress={() => router.push('/login')}>
                                            <Text style={styles.commentLogin}>Log in to comment.</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ) : null}
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.reviewBox}>
                    <Text style={styles.reviewText}>No reviews yet.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginTop: 48,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
    },
    reviewBox: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: colors.elevated,
    },
    reviewList: {
        gap: 12,
    },
    reviewForm: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: colors.elevated,
        marginBottom: 14,
    },
    writeReviewButton: {
        alignSelf: 'flex-start',
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 17,
        borderRadius: 999,
        backgroundColor: colors.accent,
        marginBottom: 14,
    },
    writeReviewButtonText: {
        color: colors.accentText,
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
    },
    reviewFormTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 12,
    },
    ratingPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
    },
    ratingButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewInput: {
        minHeight: 112,
        padding: 13,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    reviewError: {
        color: colors.danger,
        fontSize: 12,
        marginTop: 10,
    },
    reviewSubmit: {
        alignSelf: 'flex-start',
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: colors.accent,
        marginTop: 12,
    },
    reviewSubmitText: {
        color: colors.accentText,
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
    },
    loginReviewBox: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: colors.elevated,
        marginBottom: 14,
    },
    loginReviewText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 21,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    reviewAvatar: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.card,
    },
    reviewAvatarText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    reviewUser: {
        flex: 1,
    },
    reviewName: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    reviewRatingText: {
        color: '#f5c518',
        fontSize: 12,
        fontWeight: '800',
    },
    deleteButton: {
        minHeight: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: 'rgba(243,114,127,0.12)',
    },
    deleteButtonText: {
        color: colors.danger,
        fontSize: 11,
        fontWeight: '900',
    },
    reviewText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 21,
    },
    reviewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        marginTop: 14,
    },
    reviewActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    reviewActionText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    reviewActionTextActive: {
        color: colors.accent,
    },
    commentsBox: {
        gap: 12,
        paddingTop: 14,
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    commentState: {
        color: colors.textMuted,
        fontSize: 13,
    },
    commentRow: {
        flexDirection: 'row',
        gap: 9,
    },
    commentAvatar: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.card,
    },
    commentAvatarText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    commentAuthor: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 2,
    },
    commentDelete: {
        color: colors.danger,
        fontSize: 11,
        fontWeight: '800',
    },
    commentText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    commentForm: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        minHeight: 40,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 13,
    },
    commentSubmit: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    commentLogin: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '800',
    },
    pressed: {
        opacity: 0.82,
    },
});
