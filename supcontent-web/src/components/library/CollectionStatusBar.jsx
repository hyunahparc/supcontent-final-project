import { useLanguage } from '../../context/LanguageContext';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

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
        <div style={styles.barWrap}>
            <div style={styles.bar}>
                {STATUS_META.map(({ key, color }) => {
                    const count = byStatus?.[key] ?? 0;
                    const pct = total ? (count / total) * 100 : 0;
                    if (pct === 0) return null;

                    return (
                        <div
                            key={key}
                            title={`${key}: ${count}`}
                            style={{ ...styles.barSegment, width: `${pct}%`, backgroundColor: color }}
                        />
                    );
                })}
            </div>

            <div style={styles.legend}>
                {STATUS_META.map(({ key, labelKey, color }) => {
                    const count = byStatus?.[key] ?? 0;
                    if (count === 0) return null;

                    return (
                        <div key={key} style={styles.legendItem}>
                            <span style={{ ...styles.legendDot, backgroundColor: color }} />
                            <span style={styles.legendLabel}>{t(labelKey)}</span>
                            <span style={styles.legendCount}>{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    barWrap: {
        fontFamily: font,
        padding: '14px 0',
        marginBottom: '16px',
    },
    bar: {
        height: '8px',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        backgroundColor: 'var(--bg-elevated)',
        marginBottom: '15px',
    },
    barSegment: {
        height: '100%',
        transition: 'width 0.4s ease',
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px 20px',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
    },
    legendDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    legendLabel: {
        color: 'var(--text-secondary)',
        fontWeight: '400',
    },
    legendCount: {
        color: 'var(--text-primary)',
        fontWeight: '400',
    },
};
