import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserPublicLists } from '../../src/api/lists';
import { getUserProfile } from '../../src/api/users';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

export default function UserListsRoute() {
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!userId) return undefined;

    setLoading(true);
    setError('');

    Promise.all([
      getUserProfile(userId).catch(() => null),
      getUserPublicLists(userId),
    ])
      .then(([profileData, listData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setLists(listData ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load lists.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
          <Text style={styles.title}>{profile?.username ? `${profile.username}'s public lists` : 'Public lists'}</Text>
          <Text style={styles.count}>{lists.length} lists</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading lists...</Text>
        </View>
      ) : error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : lists.length ? (
        <View style={styles.listGrid}>
          {lists.map((list) => <ListCard key={list.list_id} list={list} />)}
        </View>
      ) : (
        <Text style={styles.emptyText}>No public lists yet.</Text>
      )}
    </ScrollView>
  );
}

function ListCard({ list }) {
  const posters = list.preview_posters ?? [];

  return (
    <Pressable onPress={() => router.push(`/lists/${list.list_id}`)} style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
      <View style={styles.posterGrid}>
        {[0, 1, 2, 3].map((index) => {
          const poster = posterUrl(posters[index]);

          return (
            <View key={index} style={styles.posterSlot}>
              {poster ? <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" /> : <View style={styles.posterFallback} />}
            </View>
          );
        })}
      </View>

      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.listCount}>{list.media_count ?? 0} items</Text>
      </View>
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
  listGrid: {
    gap: 14,
  },
  listCard: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },
  posterGrid: {
    width: '100%',
    height: 176,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  posterSlot: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: 'rgba(18,18,18,0.38)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    backgroundColor: colors.card,
  },
  listInfo: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  listName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  listCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
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
