import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const STATUS_META = [
  { key: 'To Watch', label: 'To Watch', color: '#747f34' },
  { key: 'Watching', label: 'Watching', color: '#2d788b' },
  { key: 'Completed', label: 'Completed', color: '#2f8f58' },
  { key: 'Dropped', label: 'Dropped', color: '#444c58' },
];

export default function CollectionStatusBar({ byStatus, total }) {
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

const styles = StyleSheet.create({
  barBlock: {
    paddingVertical: 14,
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
    fontWeight: '400',
  },
  legendCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '400',
  },
});
