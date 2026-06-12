import { useLanguage } from '../../context/LanguageContext';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

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
        <section style={styles.panel}>
            <h2 style={styles.heading}>{t('stats_title')}</h2>

            <div style={styles.secondaryRow}>
                <div style={styles.secondaryCard}>
                    <span style={styles.secondaryTitle}>{t('stats_reviews')}</span>
                    <span style={styles.statValue}>{stats.reviews_count ?? 0}</span>
                </div>

                {runtime ? (
                    <div style={styles.secondaryCard}>
                        <span style={styles.secondaryTitle}>{t('stats_watch_time')}</span>
                        <span style={styles.statValue}>{runtime}</span>
                    </div>
                ) : null}

                <div style={styles.secondaryCard}>
                    <span style={styles.secondaryTitle}>{t('stats_avg_rating')}</span>
                    {stats.avg_rating != null ? (
                        <span style={styles.statValue}>{Number(stats.avg_rating).toFixed(1)} / 5</span>
                    ) : (
                        <span style={styles.emptyText}>{t('stats_no_ratings')}</span>
                    )}
                </div>
            </div>
        </section>
    );
}

const styles = {
    panel: {
        fontFamily: font,
        color: 'var(--text-primary)',
        marginBottom: '40px',
    },
    heading: {
        margin: '0 0 20px',
        fontSize: '20px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    secondaryRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '12px',
    },
    secondaryCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
        padding: '16px clamp(12px, 3vw, 18px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
    },
    secondaryTitle: {
        fontSize: '11px',
        fontWeight: '700',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
    },
    statValue: {
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
    },
    emptyText: {
        fontSize: '13px',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
    },
};
