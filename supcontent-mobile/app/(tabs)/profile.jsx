import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibrary } from '../../src/api/collections';
import { getMyLists } from '../../src/api/lists';
import { getUserProfile } from '../../src/api/users';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(item) {
  const type = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';
  return `/${type}/${item.external_id}`;
}

export default function ProfileScreen() {
  const { user, token, isAuthenticated, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [collection, setCollection] = useState([]);
  const [lists, setLists] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const pageStyle = [
    styles.page,
    {
      paddingTop: Math.max(insets.top + 18, 40),
      paddingBottom: Math.max(insets.bottom + 6, 8),
    },
  ];

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!isAuthenticated || !user?.user_id || !token) {
        setCollection([]);
        setLists([]);
        setProfile(null);
        return undefined;
      }

      setLoadingLibrary(true);
      setLibraryError('');

      Promise.all([
        getUserProfile(user.user_id, token),
        getLibrary(user.user_id, token),
        getMyLists(token),
      ])
        .then(([profileData, libraryData, listsData]) => {
          if (cancelled) return;
          setProfile(profileData);
          setCollection(libraryData ?? []);
          setLists(listsData ?? []);
        })
        .catch((err) => {
          if (!cancelled) setLibraryError(err.message || 'Failed to load profile data.');
        })
        .finally(() => {
          if (!cancelled) setLoadingLibrary(false);
        });

      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, token, user?.user_id])
  );

  if (!isAuthenticated) {
    return (
      <View style={pageStyle}>
        <View style={styles.profileCard}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>?</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>Guest</Text>
            <Text style={styles.memberSince}>Browse public content without an account.</Text>
            <Text style={styles.bio}>Log in to manage your library, reviews, feed, and private messages.</Text>

            <View style={styles.actionRow}>
              <Link href="/login" asChild>
                <Pressable style={({ pressed }) => [styles.followBtn, pressed && styles.pressed]}>
                  <Text style={styles.followBtnText}>Log in</Text>
                </Pressable>
              </Link>

              <Link href="/register" asChild>
                <Pressable style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                  <Text style={styles.editBtnText}>Create account</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const initial = user?.username?.charAt(0).toUpperCase() ?? '?';
  const collectionPreview = collection.slice(0, 8);
  const listsPreview = lists.slice(0, 4);

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={pageStyle} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.memberSince}>{user?.email}</Text>
          <Text style={styles.bio}>{profile?.bio || 'No bio yet.'}</Text>

          <View style={styles.socialRow}>
            <View style={styles.socialItem}>
              <Text style={styles.socialNumber}>{profile?.followers_count ?? 0}</Text>
              <Text style={styles.socialLabel}>followers</Text>
            </View>
            <View style={styles.socialDivider} />
            <View style={styles.socialItem}>
              <Text style={styles.socialNumber}>{profile?.following_count ?? 0}</Text>
              <Text style={styles.socialLabel}>following</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
              <Text style={styles.editBtnText}>Edit profile</Text>
            </Pressable>

            <Pressable onPress={signOut} style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
              <Text style={styles.logoutBtnText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {loadingLibrary ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      ) : null}

      {libraryError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{libraryError}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My collection</Text>
          <Text style={styles.seeAllLink}>See all ({profile?.media_count ?? collection.length})</Text>
        </View>
        {collectionPreview.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
            {collectionPreview.map((item) => (
              <CollectionCard key={item.collection_id} item={item} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No media items yet.</Text>
        )}
      </View>

      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My lists</Text>
          <Text style={styles.seeAllLink}>See all ({lists.length})</Text>
        </View>
        {listsPreview.length ? (
          <View style={styles.listsGrid}>
            {listsPreview.map((list) => (
              <ListCard key={list.list_id} list={list} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No lists yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function CollectionCard({ item }) {
  const poster = posterUrl(item.full_data?.poster_path);

  return (
    <Pressable onPress={() => router.push(mediaRoute(item))} style={({ pressed }) => [styles.collectionCard, pressed && styles.pressed]}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.collectionPoster} resizeMode="cover" />
      ) : (
        <View style={styles.collectionFallback}>
          <Ionicons name="film-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>{item.status}</Text>
      </View>
    </Pressable>
  );
}

function ListCard({ list }) {
  const posters = list.preview_posters ?? [];

  return (
    <Pressable style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
      <View style={styles.listPosterGrid}>
        {[0, 1, 2, 3].map((index) => {
          const poster = posterUrl(posters[index]);

          return (
            <View key={index} style={styles.listPosterSlot}>
              {poster ? (
                <Image source={{ uri: poster }} style={styles.listPoster} resizeMode="cover" />
              ) : (
                <View style={styles.listPosterFallback} />
              )}
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
  scrollPage: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  profileCard: {
    alignItems: 'center',
    gap: 18,
    padding: 28,
    marginBottom: 34,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 3,
    borderColor: colors.border,
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
  },
  profileInfo: {
    width: '100%',
    alignItems: 'center',
  },
  username: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 5,
    textAlign: 'center',
  },
  memberSince: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 22,
  },
  socialItem: {
    alignItems: 'center',
    gap: 2,
  },
  socialNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  socialLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  socialDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.elevated,
  },
  actionRow: {
    width: '100%',
    gap: 12,
  },
  followBtn: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  followBtnText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '800',
  },
  editBtn: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  editBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 34,
  },
  lastSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  seeAllLink: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  errorBox: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(243,114,127,0.12)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  posterRow: {
    gap: 12,
    paddingRight: 24,
  },
  collectionCard: {
    position: 'relative',
    width: 116,
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  collectionPoster: {
    width: '100%',
    height: '100%',
  },
  collectionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    left: 7,
    right: 7,
    bottom: 7,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  statusBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  listsGrid: {
    gap: 12,
  },
  listCard: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },
  listPosterGrid: {
    width: '100%',
    height: 176,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  listPosterSlot: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: 'rgba(18,18,18,0.38)',
  },
  listPoster: {
    width: '100%',
    height: '100%',
  },
  listPosterFallback: {
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
  pressed: {
    opacity: 0.78,
  },
});
