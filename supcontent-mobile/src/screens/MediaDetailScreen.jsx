import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaById } from '../api/media';
import { getCollectionStatus, removeFromCollection, upsertCollection } from '../api/collections';
import { addComment, getComments, getMyReview, getReviews, toggleLike, upsertReview } from '../api/reviews';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';
const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];

function imageUrl(base, path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${base}${path}`;
}

function runtimeLabel(runtime) {
  if (!runtime) return null;
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function mediaRoute(item, fallbackType) {
  const type = item.media_type ?? fallbackType;
  const routeType = type === 'Series' || type === 'tv' ? 'tv' : 'movie';

  return `/${routeType}/${item.id}`;
}

export default function MediaDetailScreen({ mediaType }) {
  const { id } = useLocalSearchParams();
  const mediaId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collectionStatus, setCollectionStatus] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
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

    if (!mediaId) return undefined;

    setLoading(true);
    setError('');

    getMediaById(mediaId, mediaType)
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load media.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaId, mediaType]);

  useEffect(() => {
    let cancelled = false;

    if (!mediaId) return undefined;

    if (!token) {
      setCollectionStatus(null);
      return;
    }

    getCollectionStatus(mediaId, mediaType, token).then((status) => {
      if (!cancelled) setCollectionStatus(status);
    });

    return () => {
      cancelled = true;
    };
  }, [mediaId, mediaType, token]);

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

  const posterUri = imageUrl(POSTER_BASE, media?.poster_path);
  const backdropUri = imageUrl(BACKDROP_BASE, media?.backdrop_path);
  const year = media?.release_date?.slice(0, 4);
  const runtime = runtimeLabel(media?.runtime);
  const score = media?.vote_average ? Number(media.vote_average).toFixed(1) : null;
  const metaItems = useMemo(() => [year, runtime].filter(Boolean), [year, runtime]);

  async function openTrailer() {
    if (!media?.trailer?.key) return;
    await Linking.openURL(`https://www.youtube.com/watch?v=${media.trailer.key}`);
  }

  function handleCollectionPress() {
    if (!token) {
      router.push('/login');
      return;
    }

    setShowStatusMenu((current) => !current);
  }

  async function handleStatusSelect(status) {
    if (!token) return;

    if (status === collectionStatus) {
      await removeFromCollection(mediaId, mediaType, token);
      setCollectionStatus(null);
    } else {
      await upsertCollection(mediaId, mediaType, status, token);
      setCollectionStatus(status);
    }

    setShowStatusMenu(false);
  }

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
        const nextLikes = Math.max(0, Number(review.likes_count ?? 0) + (isLiked && !wasLiked ? 1 : !isLiked && wasLiked ? -1 : 0));

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

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!media) return null;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 52) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.heroStage}>
        {backdropUri ? (
          <ImageBackground
            source={{ uri: backdropUri }}
            style={[styles.backdrop, { paddingTop: insets.top + 10 }]}
            imageStyle={styles.backdropImage}
          >
            <View style={styles.backdropShade} />
          </ImageBackground>
        ) : (
          <View style={[styles.backdrop, { paddingTop: insets.top + 10 }]}>
            <View style={styles.backdropShade} />
          </View>
        )}

        <View style={styles.hero}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={styles.posterFallback}>
              <Ionicons name="film-outline" size={52} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.title}>{media.title}</Text>

            <View style={styles.metaRow}>
              {metaItems.map((item) => (
                <Text key={item} style={styles.metaText}>{item}</Text>
              ))}
              {score ? (
                <View style={styles.rating}>
                  <Ionicons name="star" size={13} color="#f5c518" />
                  <Text style={styles.ratingText}>{score}</Text>
                </View>
              ) : null}
            </View>

            {media.genres?.length ? (
              <View style={styles.genreRow}>
                {media.genres.map((genre) => (
                  <View key={genre.id ?? genre.name} style={styles.genrePill}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              {media.trailer?.key ? (
                <Pressable onPress={openTrailer} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="play" size={16} color={colors.accentText} />
                  <Text style={styles.primaryButtonText}>Watch Trailer</Text>
                </Pressable>
              ) : null}

              <Pressable onPress={handleCollectionPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.outlineButtonText}>{collectionStatus ?? 'Collection'}</Text>
              </Pressable>
            </View>

            {showStatusMenu ? (
              <View style={styles.statusMenu}>
                {STATUSES.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusSelect(status)}
                    style={[styles.statusOption, status === collectionStatus && styles.statusOptionActive]}
                  >
                    <Text style={[styles.statusOptionText, status === collectionStatus && styles.statusOptionTextActive]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {media.director ? (
              <Text style={styles.director}>
                <Text style={styles.directorLabel}>Director </Text>
                {media.director}
              </Text>
            ) : null}

            {media.overview ? (
              <Text style={styles.overview}>{media.overview}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {media.cast?.length ? (
        <Section title="Cast">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
            {media.cast.slice(0, 12).map((actor) => (
              <View key={actor.id} style={styles.castCard}>
                {actor.profile_path ? (
                  <Image source={{ uri: imageUrl(PROFILE_BASE, actor.profile_path) }} style={styles.castImage} />
                ) : (
                  <View style={styles.castFallback}>
                    <Text style={styles.castFallbackText}>{actor.name?.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.castBody}>
                  <Text style={styles.castName} numberOfLines={1}>{actor.name}</Text>
                  <Text style={styles.castRole} numberOfLines={1}>{actor.character}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      {media.similar?.length ? (
        <Section title="You May Also Like">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
            {media.similar.map((item) => (
              <Pressable
                key={`${item.id}-${item.media_type ?? mediaType}`}
                onPress={() => router.push(mediaRoute(item, mediaType))}
                style={({ pressed }) => [styles.similarCard, pressed && styles.pressed]}
              >
                {item.poster_path ? (
                  <Image source={{ uri: imageUrl(POSTER_BASE, item.poster_path) }} style={styles.similarPoster} />
                ) : (
                  <View style={styles.similarFallback} />
                )}
                <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                {item.vote_average ? (
                  <Text style={styles.similarRating}>{Number(item.vote_average).toFixed(1)}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Section title="Community Reviews">
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
                          <Text style={styles.commentAuthor}>{comment.username}</Text>
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
      </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.background,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  retryButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '800',
  },
  heroStage: {
    position: 'relative',
  },
  backdrop: {
    height: 400,
    backgroundColor: colors.elevated,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  backdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,18,0.58)',
  },
  hero: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
    marginTop: -238,
  },
  poster: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  posterFallback: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 2 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  info: {
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 37,
    marginBottom: 11,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: '700',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genrePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  outlineButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  outlineButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  statusMenu: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: colors.elevated,
  },
  statusOptionActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(30,215,96,0.14)',
  },
  statusOptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusOptionTextActive: {
    color: colors.accent,
  },
  director: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  directorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  overview: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
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
  castRow: {
    gap: 10,
    paddingRight: 20,
  },
  castCard: {
    width: 118,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  castImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.card,
  },
  castFallback: {
    width: '100%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  castFallbackText: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: '800',
  },
  castBody: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 10,
  },
  castName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  castRole: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  similarRow: {
    gap: 12,
    paddingRight: 20,
  },
  similarCard: {
    width: 150,
  },
  similarPoster: {
    width: 150,
    height: 225,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  similarFallback: {
    width: 150,
    height: 225,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  similarTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  similarRating: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
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
  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
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
