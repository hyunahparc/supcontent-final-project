import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibrary } from '../api/collections';
import { followUser, getFollowers, getFollowing, unfollowUser } from '../api/follows';
import { getMyLists, getUserPublicLists } from '../api/lists';
import { getUnreadMessageCount } from '../api/messages';
import { getUnreadCount } from '../api/notifications';
import { getUserProfile } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

function posterUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(item) {
  const type = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';
  return `/${type}/${item.external_id}`;
}

export default function PublicProfileScreen({ profileUserId = null, isTabProfile = false }) {
  const { id } = useLocalSearchParams();
  const routeUserId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const { user, token, isAuthenticated, signOut } = useAuth();
  const userId = profileUserId ?? routeUserId;
  const [profile, setProfile] = useState(null);
  const [collection, setCollection] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const isOwnProfile = Number(userId) === Number(user?.user_id);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      setProfile(null);
      setCollection([]);
      setLists([]);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError('');

    try {
      const [profileData, libraryData, listsData] = await Promise.all([
        getUserProfile(userId, token),
        getLibrary(userId, token),
        isOwnProfile && token ? getMyLists(token) : getUserPublicLists(userId),
      ]);

      setProfile(profileData);
      setCollection((libraryData ?? []).slice(0, 8));
      setLists(listsData ?? []);
    } catch (err) {
      setError(err.message || 'Unable to load this profile.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, token, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile({ silent: true });
    }, [loadProfile])
  );

  const loadUnreadIndicators = useCallback(async () => {
    if (!isOwnProfile || !token) {
      setUnreadCount(0);
      setUnreadMessageCount(0);
      return;
    }

    const [notificationData, messageData] = await Promise.all([
      getUnreadCount(token).catch(() => ({ count: 0 })),
      getUnreadMessageCount(token).catch(() => ({ count: 0 })),
    ]);

    setUnreadCount(notificationData?.count ?? 0);
    setUnreadMessageCount(messageData?.count ?? 0);
  }, [isOwnProfile, token]);

  useEffect(() => {
    loadUnreadIndicators();
  }, [loadUnreadIndicators]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadIndicators();
    }, [loadUnreadIndicators])
  );

  useEffect(() => {
    if (!isOwnProfile || !token) return undefined;

    const intervalId = setInterval(loadUnreadIndicators, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOwnProfile, loadUnreadIndicators, token]);

  async function handleFollow() {
    if (!token) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);

    try {
      await followUser(userId, token);
      setProfile((current) => ({
        ...current,
        is_following: true,
        followers_count: Number(current?.followers_count ?? 0) + 1,
      }));
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleUnfollow() {
    if (!token) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);

    try {
      await unfollowUser(userId, token);
      setProfile((current) => ({
        ...current,
        is_following: false,
        followers_count: Math.max(0, Number(current?.followers_count ?? 0) - 1),
      }));
    } finally {
      setFollowLoading(false);
    }
  }

  async function openUserList(type) {
    setModalType(type);
    setModalLoading(true);

    try {
      const data = type === 'followers'
        ? await getFollowers(userId)
        : await getFollowing(userId);
      setModalUsers(data ?? []);
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalType(null);
    setModalUsers([]);
  }

  if (isTabProfile && !isAuthenticated) {
    return (
      <View
        style={[
          styles.guestPage,
          {
            paddingTop: Math.max(insets.top + 18, 44),
            paddingBottom: Math.max(insets.bottom + 24, 42),
          },
        ]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>?</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>Guest</Text>
            <Text style={styles.memberSince}>Browse public content without an account.</Text>
            <Text style={styles.bio}>Log in to manage your library, reviews, feed, and private messages.</Text>

            <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.followButton, pressed && styles.pressed]}>
              <Text style={styles.followButtonText}>Log in</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.backAction}>
          <Text style={styles.backActionText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) return null;

  const initial = profile.username?.charAt(0)?.toUpperCase() ?? '?';
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <>
      <ScrollView
        style={styles.scrollPage}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 18, 44),
          paddingBottom: Math.max(insets.bottom + 24, 42),
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{profile.username}</Text>
            {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}
            <Text style={styles.bio}>{profile.bio || 'No bio yet.'}</Text>

            {profile.link ? (
              <Pressable onPress={() => Linking.openURL(profile.link)}>
                <Text style={styles.profileLink} numberOfLines={1}>
                  {profile.link.replace(/^https?:\/\//, '')}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.socialRow}>
              <Pressable onPress={() => openUserList('followers')} style={styles.socialItem}>
                <Text style={styles.socialNumber}>{profile.followers_count ?? 0}</Text>
                <Text style={styles.socialLabel}>followers</Text>
              </Pressable>
              <View style={styles.socialDivider} />
              <Pressable onPress={() => openUserList('following')} style={styles.socialItem}>
                <Text style={styles.socialNumber}>{profile.following_count ?? 0}</Text>
                <Text style={styles.socialLabel}>following</Text>
              </Pressable>
            </View>

            {isOwnProfile ? (
              <>
                <View style={styles.dashboardActionRow}>
                  <Pressable
                    onPress={() => router.push('/notifications')}
                    accessibilityLabel="Notifications"
                    style={({ pressed }) => [styles.dashboardIconButton, pressed && styles.pressed]}
                  >
                    <View style={styles.dashboardIconWrap}>
                      <Ionicons name="notifications-outline" size={22} color={colors.text} />
                      {unreadCount ? <View style={styles.iconUnreadDot} /> : null}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/messages')}
                    accessibilityLabel="Messages"
                    style={({ pressed }) => [styles.dashboardIconButton, pressed && styles.pressed]}
                  >
                    <View style={styles.dashboardIconWrap}>
                      <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                      {unreadMessageCount ? <View style={styles.iconUnreadDot} /> : null}
                    </View>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => router.push('/settings/profile')}
                  style={({ pressed }) => [styles.secondaryButton, styles.actionSpacing, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Edit profile</Text>
                </Pressable>
              </>
            ) : profile.is_following ? (
              <Pressable
                onPress={handleUnfollow}
                disabled={followLoading}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, followLoading && styles.disabled]}
              >
                <Text style={styles.secondaryButtonText}>{followLoading ? 'Saving...' : 'Following'}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleFollow}
                disabled={followLoading}
                style={({ pressed }) => [styles.followButton, pressed && styles.pressed, followLoading && styles.disabled]}
              >
                <Text style={styles.followButtonText}>{followLoading ? 'Saving...' : 'Follow'}</Text>
              </Pressable>
            )}

            {!isOwnProfile ? (
              <Pressable
                onPress={() => (token ? router.push(`/messages/${userId}`) : router.push('/login'))}
                style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>
            ) : null}
          </View>

        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isOwnProfile ? 'My collection' : `${profile.username}'s collection`}</Text>
            {isOwnProfile ? (
              <Pressable onPress={() => router.push('/library')} hitSlop={8}>
                <Text style={styles.sectionLink}>See all ({profile.media_count ?? collection.length})</Text>
              </Pressable>
            ) : (
              <Text style={styles.sectionCount}>{profile.media_count ?? collection.length}</Text>
            )}
          </View>

          {collection.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
              {collection.map((item) => <CollectionCard key={item.collection_id} item={item} />)}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No media items yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isOwnProfile ? 'My lists' : `${profile.username}'s public lists`}</Text>
            {isOwnProfile ? (
              <Pressable onPress={() => router.push('/library?view=lists')} hitSlop={8}>
                <Text style={styles.sectionLink}>See all ({lists.length})</Text>
              </Pressable>
            ) : (
              <Text style={styles.sectionCount}>{lists.length}</Text>
            )}
          </View>

          {lists.length ? (
            <View style={styles.listsGrid}>
              {lists.map((list) => <ListCard key={list.list_id} list={list} />)}
            </View>
          ) : (
            <Text style={styles.emptyText}>{isOwnProfile ? 'No lists yet.' : 'No public lists yet.'}</Text>
          )}
        </View>

        {isOwnProfile ? (
          <Pressable onPress={signOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
            <Text style={styles.signOutButtonText}>Sign out</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(modalType)} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalType === 'followers' ? 'Followers' : 'Following'}</Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {modalLoading ? (
              <View style={styles.modalState}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : modalUsers.length ? (
              modalUsers.map((item) => (
                <Pressable
                  key={item.user_id}
                  onPress={() => {
                    closeModal();
                    router.push(`/users/${item.user_id}`);
                  }}
                  style={({ pressed }) => [styles.modalUser, pressed && styles.pressed]}
                >
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{item.username?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.modalUsername}>{item.username}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>No users yet.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    <Pressable onPress={() => router.push(`/lists/${list.list_id}`)} style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
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
  guestPage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  backAction: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  backActionText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
  },
  profileCard: {
    alignItems: 'center',
    gap: 18,
    padding: 28,
    marginBottom: 34,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.elevated,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 56,
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
    marginBottom: 14,
    textAlign: 'center',
  },
  profileLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 18,
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
  followButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  followButtonText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '800',
  },
  dashboardActionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  dashboardIconButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  dashboardIconWrap: {
    position: 'relative',
  },
  iconUnreadDot: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface,
    zIndex: 2,
  },
  messageButton: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  messageButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionSpacing: {
    marginTop: 12,
  },
  signOutButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 34,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionLink: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  modalCard: {
    maxHeight: '72%',
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalState: {
    paddingVertical: 28,
  },
  modalUser: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  modalAvatarText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  modalUsername: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.78,
  },
});
