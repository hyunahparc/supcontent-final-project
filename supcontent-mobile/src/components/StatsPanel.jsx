// StatsPanel — collection statistics (React Native)
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const STATUS_META = [
  { key: 'Completed', label: 'Completed', color: colors.accent },
  { key: 'Watching',  label: 'Watching',  color: colors.info },
  { key: 'To Watch',  label: 'To Watch',  color: colors.warning },
  { key: 'Dropped',   label: 'Dropped',   color: colors.danger },
];

function formatRuntime(minutes) {
  if (!minutes || minutes === 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function StatusBar({ byStatus, total }) {
  if (!total) return null;
  return (
    <View style={styles.barBlock}>
      <View style={styles.bar}>
        {STATUS_META.map(({ key, color }) => {
          const count = byStatus?.[key] ?? 0;
          const pct = total ? count / total : 0;
          if (pct === 0) return null;
          return (
            <View
              key={key}
              style={[styles.barSegment, { flex: pct, backgroundColor: color }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {STATUS_META.map(({ key, label, color }) => {
          const count = byStatus?.[key] ?? 0;
          if (count === 0) return null;
          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{label}</Text>
              <Text style={styles.legendCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const runtime = formatRuntime(stats.total_runtime_minutes);

  const highlights = [
    { label: 'Total',     value: stats.total ?? 0 },
    { label: 'Done',      value: stats.by_status?.Completed ?? 0 },
    { label: 'Reviews',   value: stats.reviews_count ?? 0 },
    { label: 'Lists',     value: stats.lists_count ?? 0 },
  ];

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Statistics</Text>

      {/* Highlight cards */}
      <View style={styles.cards}>
        {highlights.map(({ label, value }) => (
          <View key={label} style={styles.card}>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Status distribution bar */}
      {stats.total > 0 && (
        <StatusBar byStatus={stats.by_status} total={stats.total} />
      )}

      {/* Secondary row */}
      <View style={styles.secondaryRow}>
        {/* Movies vs Series */}
        {stats.total > 0 && (
          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryTitle}>CONTENT TYPE</Text>
            <View style={styles.typeRow}>
              <View style={styles.typeItem}>
                <Text style={styles.typeValue}>{stats.movies_count ?? 0}</Text>
                <Text style={styles.typeLabel}>Movies</Text>
              </View>
              <View style={styles.typeDivider} />
              <View style={styles.typeItem}>
                <Text style={styles.typeValue}>{stats.series_count ?? 0}</Text>
                <Text style={styles.typeLabel}>Series</Text>
              </View>
            </View>
          </View>
        )}

        {/* Watch time */}
        {runtime ? (
          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryTitle}>WATCH TIME</Text>
            <Text style={styles.runtimeValue}>{runtime}</Text>
            <Text style={styles.runtimeSub}>completed movies</Text>
          </View>
        ) : null}

        {/* Average rating */}
        <View style={styles.secondaryCard}>
          <Text style={styles.secondaryTitle}>AVG RATING</Text>
          {stats.avg_rating != null ? (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingValue}>{Number(stats.avg_rating).toFixed(1)}</Text>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingMax}> / 5</Text>
            </View>
          ) : (
            <Text style={styles.ratingEmpty}>No ratings yet</Text>
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

  // Highlight cards
  cards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 4,
  },
  cardValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Status bar
  barBlock: {
    marginBottom: 16,
  },
  bar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.elevated,
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  legendCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  // Secondary row
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
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // Content type
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  typeItem: {
    gap: 2,
  },
  typeValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  typeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  typeDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.elevated,
  },

  // Watch time
  runtimeValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  runtimeSub: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  ratingValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  ratingStar: {
    color: '#f5c518',
    fontSize: 16,
  },
  ratingMax: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  ratingEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
