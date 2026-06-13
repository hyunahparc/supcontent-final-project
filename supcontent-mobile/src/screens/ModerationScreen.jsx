import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteReportedReview, getReports, updateReportStatus } from '../api/moderation';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ModerationScreen() {
  const insets = useSafeAreaInsets();
  const { token, signOut } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getReports('pending', token)
      .then((data) => setReports(data ?? []))
      .catch((err) => setError(err.message || 'Unable to load reports.'))
      .finally(() => setLoading(false));
  }, [token]);

  // Reload each time the tab gains focus
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function runAction(reportId, action) {
    setBusyId(reportId);
    setError('');
    try {
      await action();
      const next = await getReports('pending', token);
      setReports(next ?? []);
    } catch (err) {
      setError(err.message || 'Admin action failed.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(report) {
    Alert.alert('Delete review', 'Delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => runAction(report.report_id, () => deleteReportedReview(report.review_id, token)),
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top + 18, 44),
        paddingBottom: Math.max(insets.bottom + 96, 120),
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Admin</Text>
          <Text style={styles.title}>Moderation reports</Text>
        </View>
        <Pressable onPress={signOut} style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>No pending reports.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {reports.map((report) => {
            const busy = busyId === report.report_id;
            return (
              <View key={report.report_id} style={styles.card}>
                <Text style={styles.meta}>Report #{report.report_id} by {report.reporter_username}</Text>
                <Text style={styles.reviewTitle}>Review by {report.author_username}</Text>

                <Text style={styles.reason}>
                  <Text style={styles.reasonLabel}>Reason: </Text>
                  {report.reason || 'No reason provided.'}
                </Text>
                <Text style={styles.comment}>{report.review_comment || '(No written comment)'}</Text>

                <View style={styles.details}>
                  <Text style={styles.detailText}>Rating: {report.review_rating ?? '-'}</Text>
                  <Text style={styles.detailText}>{report.media_type} #{report.external_id}</Text>
                  <Text style={styles.detailText}>{new Date(report.created_at).toLocaleString()}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    disabled={busy}
                    onPress={() => runAction(report.report_id, () => updateReportStatus(report.report_id, 'rejected', token))}
                    style={({ pressed }) => [styles.secondaryBtn, (pressed || busy) && styles.pressed]}
                  >
                    <Text style={styles.secondaryBtnText}>Dismiss</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => confirmDelete(report)}
                    style={({ pressed }) => [styles.dangerBtn, (pressed || busy) && styles.pressed]}
                  >
                    <Text style={styles.dangerBtnText}>Delete review</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  signOutBtn: {
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  signOutText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 14,
  },
  state: {
    padding: 32,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: 'center',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  reason: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  reasonLabel: {
    fontWeight: '800',
  },
  comment: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  detailText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderVisible,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  dangerBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,114,127,0.5)',
    backgroundColor: 'transparent',
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
