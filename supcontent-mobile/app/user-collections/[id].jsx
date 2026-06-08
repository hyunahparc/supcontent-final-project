import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibrary } from '../../src/api/collections';
import { getUserProfile } from '../../src/api/users';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(item) {
  const type = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';
  return `/${type}/${item.external_id}`;
}

export default function UserCollectionRoute() {
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!userId) return undefined;

    setLoading(true);
    setError('');

    Promise.all([
      getUserProfile(userId, token).catch(() => null),
      getLibrary(userId, token),
    ])
      .then(([profileData, collectionData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setItems(collectionData ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load collection.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top + 18, 44),
        paddingBottom: Math.max(insets.bottom + 24, 42),
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{profile?.username ? `${profile.username}'s collection` : 'Collection'}</Text>
          <Text style={styles.count}>{items.length} items</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading collection...</Text>
        </View>
      ) : error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : items.length ? (
        <View style={styles.grid}>
          {items.map((item) => <CollectionCard key={item.collection_id} item={item} />)}
        </View>
      ) : (
        <Text style={styles.emptyText}>No media items yet.</Text>
      )}
    </ScrollView>
  );
}

function CollectionCard({ item }) {
  const poster = posterUrl(item.full_data?.poster_path);

  return (
    <Pressable onPress={() => router.push(mediaRoute(item))} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={styles.posterFallback}>
          <Ionicons name="film-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>{item.full_data?.title}</Text>
      <Text style={styles.cardMeta}>{item.status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  count: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  card: {
    width: '47.2%',
    gap: 7,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  posterFallback: {
    width: '100%',
    aspectRatio: 2 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingTop: 16,
  },
  pressed: {
    opacity: 0.78,
  },
});
