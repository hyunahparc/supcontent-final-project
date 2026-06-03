import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const { user, isAuthenticated, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const pageStyle = [
    styles.page,
    {
      paddingTop: Math.max(insets.top + 18, 40),
      paddingBottom: Math.max(insets.bottom + 84, 96),
    },
  ];

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

  return (
    <View style={pageStyle}>
      <View style={styles.profileCard}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.memberSince}>{user?.email}</Text>
          <Text style={styles.bio}>No bio yet.</Text>

          <View style={styles.socialRow}>
            <View style={styles.socialItem}>
              <Text style={styles.socialNumber}>0</Text>
              <Text style={styles.socialLabel}>followers</Text>
            </View>
            <View style={styles.socialDivider} />
            <View style={styles.socialItem}>
              <Text style={styles.socialNumber}>0</Text>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My collection</Text>
          <Text style={styles.seeAllLink}>See all (0)</Text>
        </View>
        <Text style={styles.emptyText}>No media items yet.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My lists</Text>
          <Text style={styles.seeAllLink}>See all (0)</Text>
        </View>
        <Text style={styles.emptyText}>No lists yet.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
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
  pressed: {
    opacity: 0.78,
  },
});
