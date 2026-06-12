import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';

function formatRuntime(minutes) {
  if (!minutes || minutes === 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function ProfileStatsPanel({ stats }) {
  const { t } = useLanguage();
  if (!stats) return null;

  const runtime = formatRuntime(stats.total_runtime_minutes);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>{t('stats_title')}</Text>

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryCard}>
          <Text style={styles.secondaryTitle}>{t('stats_reviews').toUpperCase()}</Text>
          <Text style={styles.statValue}>{stats.reviews_count ?? 0}</Text>
        </View>

        {runtime ? (
          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryTitle}>{t('stats_watch_time').toUpperCase()}</Text>
            <Text style={styles.statValue}>{runtime}</Text>
          </View>
        ) : null}

        <View style={styles.secondaryCard}>
          <Text style={styles.secondaryTitle}>{t('stats_avg_rating').toUpperCase()}</Text>
          {stats.avg_rating != null ? (
            <Text style={styles.statValue}>{Number(stats.avg_rating).toFixed(1)} / 5</Text>
          ) : (
            <Text style={styles.emptyText}>{t('stats_no_ratings')}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginBottom: 28,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryCard: {
    flex: 1,
    minWidth: 100,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  secondaryTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.8,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
