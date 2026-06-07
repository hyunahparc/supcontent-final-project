import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFeed } from '../../src/api/feed';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w780';

function formatDate(value) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(activity) {
  const type = activity.media_type === 'Series' || activity.media_type === 'tv' ? 'tv' : 'movie';

  return `/${type}/${activity.external_id}`;
}

function activityText(activity) {
  if (activity.activity_type === 'review') return 'reviewed';

  if (activity.activity_type === 'collection') {
    const status = activity.metadata?.status;
    return status ? `added this to ${status}` : 'updated their collection';
  }

  return 'shared an activity';
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { token, isAuthenticated } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);

  const pagePadding = {
    paddingTop: Math.max(insets.top + 26, 52),
    paddingBottom: Math.max(insets.bottom + 20, 32),
  };

  const loadFeed = useCallback(async ({ showLoading = false, showRefreshing = false } = {}) => {
    if (!token) return;

    if (showLoading) setLoading(true);
    if (showRefreshing) setRefreshing(true);
    setError('');

    try {
      const data = await getFeed(token);
      setActivities(data?.results ?? []);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err.message || 'Unable to load your feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !token) {
        setActivities([]);
        hasLoadedRef.current = false;
        return undefined;
      }

      loadFeed({ showLoading: !hasLoadedRef.current });

      return undefined;
    }, [isAuthenticated, loadFeed, token])
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.guestPage, pagePadding]}>
        <Ionicons name="newspaper-outline" size={44} color={colors.accent} />
        <Text style={styles.guestTitle}>Feed</Text>
        <Text style={styles.guestBody}>Log in to see recent activity from people you follow.</Text>
        <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, pagePadding]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadFeed({ showRefreshing: true })}
          tintColor={colors.accent}
        />
      }
    >
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadFeed({ showLoading: true })} hitSlop={8}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading feed...</Text>
        </View>
      ) : activities.length ? (
        <View style={styles.list}>
          {activities.map((activity) => (
            <ActivityCard key={activity.activity_id} activity={activity} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyHint}>Follow users to see their activity here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ActivityCard({ activity }) {
  const poster = posterUrl(activity.full_data?.poster_path);
  const title = activity.full_data?.title ?? activity.full_data?.name ?? 'Unknown title';
  const reviewRating = activity.metadata?.rating ?? activity.rating;
  const reviewComment = activity.metadata?.comment ?? activity.comment;
  const actorInitial = activity.actor_username?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={styles.card}>
      <View style={styles.postTitleBar}>
        <Text style={styles.mediaTitle} numberOfLines={1}>{title}</Text>
      </View>

      {activity.external_id ? (
        <Pressable onPress={() => router.push(mediaRoute(activity))} style={({ pressed }) => [styles.postMedia, pressed && styles.pressed]}>
          <View style={styles.posterStage}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
            ) : (
              <View style={styles.posterFallback} />
            )}
          </View>
        </Pressable>
      ) : null}

      <View style={styles.postBody}>
        <View style={styles.postHeader}>
          {activity.actor_avatar ? (
            <Image source={{ uri: activity.actor_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{actorInitial}</Text>
            </View>
          )}

          <View style={styles.postHeaderText}>
            <Text style={styles.actionLine} numberOfLines={2}>
              <Text style={styles.username}>{activity.actor_username}</Text>
              <Text style={styles.actionLabel}> {activityText(activity)}</Text>
            </Text>
            <Text style={styles.date}>{formatDate(activity.created_at)}</Text>
          </View>
        </View>

        {activity.activity_type === 'review' && (reviewRating || reviewComment) ? (
          <View style={styles.reviewBox}>
            {reviewRating ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={17} color="#f5c518" />
                <Text style={styles.ratingText}>{Number(reviewRating).toFixed(1)}</Text>
              </View>
            ) : null}

            {reviewComment ? (
              <Text style={styles.caption} numberOfLines={5}>{reviewComment}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  guestPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  guestTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 14,
  },
  guestBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  loginButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  loginButtonText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '900',
  },
  header: {
    marginBottom: 28,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(243,114,127,0.12)',
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  retryText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  stateBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    gap: 18,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 13,
  },
  postTitleBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  postHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  actionLine: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  postMedia: {
    width: '100%',
    backgroundColor: colors.elevated,
  },
  posterStage: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
  },
  postBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 15,
  },
  mediaTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  ratingText: {
    color: '#f5c518',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.elevated,
  },
  caption: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.78,
  },
});
