import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';

const STATUS_META = [
  { key: 'To Watch', labelKey: 'stats_to_watch', color: '#747f34' },
  { key: 'Watching', labelKey: 'stats_watching', color: '#2d788b' },
  { key: 'Completed', labelKey: 'stats_completed', color: '#2f8f58' },
  { key: 'Dropped', labelKey: 'stats_dropped', color: '#444c58' },
];

export default function CollectionStatusBar({ byStatus, total }) {
  const { t } = useLanguage();
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
        {STATUS_META.map(({ key, labelKey, color }) => {
          const count = byStatus?.[key] ?? 0;
          if (count === 0) return null;

          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{t(labelKey)}</Text>
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
