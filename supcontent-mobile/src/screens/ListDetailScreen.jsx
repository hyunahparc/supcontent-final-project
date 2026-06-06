import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getListById, removeMediaFromList } from '../api/lists';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(item) {
  const type = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';

  return {
    pathname: `/${type}/${item.external_id}`,
    params: { from: 'list' },
  };
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams();
  const listId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!listId) return undefined;

    setLoading(true);
    setError('');

    getListById(listId, token)
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load list.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listId, token]);

  const isOwner = user?.user_id === list?.user_id;

  function confirmRemove(item) {
    Alert.alert('Remove this item?', 'This media will be removed from the list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;

          await removeMediaFromList(listId, item.external_id, item.media_type, token);
          setList((current) => ({
            ...current,
            media_items: current.media_items.filter((media) => (
              media.external_id !== item.external_id || media.media_type !== item.media_type
            )),
          }));
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading list...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!list) return null;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top + 26, 52),
        paddingBottom: Math.max(insets.bottom + 22, 34),
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>{list.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Ionicons name={list.is_public ? 'globe-outline' : 'lock-closed-outline'} size={13} color={colors.textSecondary} />
              <Text style={styles.badgeText}>{list.is_public ? 'Public' : 'Private'}</Text>
            </View>
            <Text style={styles.count}>{list.media_items?.length ?? 0} items</Text>
          </View>
        </View>
      </View>

      {!list.media_items?.length ? (
        <Text style={styles.emptyText}>No media items in this list yet.</Text>
      ) : (
        <View style={styles.grid}>
          {list.media_items.map((item) => (
            <ListMediaCard
              key={`${item.external_id}-${item.media_type}`}
              isOwner={isOwner}
              item={item}
              onRemove={() => confirmRemove(item)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ListMediaCard({ isOwner, item, onRemove }) {
  const data = item.full_data ?? {};
  const poster = posterUrl(data.poster_path);
  const year = data.release_date?.slice(0, 4);
  const rating = data.vote_average ? Number(data.vote_average).toFixed(1) : null;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => router.push(mediaRoute(item))} style={({ pressed }) => [styles.cardLink, pressed && styles.cardPressed]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <Ionicons name="film-outline" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.mediaTitle} numberOfLines={1}>{data.title ?? 'Unknown'}</Text>
          {year ? <Text style={styles.mediaYear}>{year}</Text> : null}
          {rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#f5c518" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {isOwner ? (
        <Pressable onPress={onRemove} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={16} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 24,
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
    textAlign: 'center',
  },
  backButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  backButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 34,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 9,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  card: {
    position: 'relative',
    width: '47.2%',
    overflow: 'visible',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  cardLink: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: colors.card,
  },
  posterFallback: {
    width: '100%',
    aspectRatio: 2 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 12,
  },
  mediaTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  mediaYear: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    color: '#f5c518',
    fontSize: 11,
    fontWeight: '800',
  },
  removeButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    zIndex: 5,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  pressed: {
    opacity: 0.78,
  },
});
