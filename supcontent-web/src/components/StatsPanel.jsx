import { useLanguage } from '../context/LanguageContext';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const STATUS_COLORS = {
    Completed: '#1ed760',
    Watching:  '#539df5',
    'To Watch': '#ffa42b',
    Dropped:   '#f3727f',
};

function formatRuntime(minutes) {
    if (!minutes || minutes === 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function StarRating({ value, t }) {
    if (value == null) return <span style={styles.ratingEmpty}>{t('stats_no_ratings')}</span>;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const fill = value >= i ? 'full' : value >= i - 0.5 ? 'half' : 'empty';
        stars.push(
            <span key={i} style={{ position: 'relative', fontSize: 16, lineHeight: 1, width: 16, display: 'inline-block' }}>
                <span style={{ color: 'var(--bg-elevated)' }}>★</span>
                {fill !== 'empty' && (
                    <span style={{
                        color: '#f5c518',
                        position: 'absolute',
                        left: 0,
                        overflow: 'hidden',
                        width: fill === 'half' ? '50%' : '100%',
                        display: 'block',
                        whiteSpace: 'nowrap',
                    }}>★</span>
                )}
            </span>
        );
    }
    return (
        <span style={styles.starRow}>
            {stars}
            <span style={styles.ratingNum}>{Number(value).toFixed(1)}</span>
        </span>
    );
}

function StatusBar({ byStatus, total, t }) {
    if (!total) return null;
    const STATUS_KEYS = [
        { key: 'Completed', tKey: 'stats_completed' },
        { key: 'Watching',  tKey: 'stats_watching'  },
        { key: 'To Watch',  tKey: 'stats_to_watch'  },
        { key: 'Dropped',   tKey: 'stats_dropped'   },
    ];
    return (
        <div style={styles.barWrap}>
            <div style={styles.bar}>
                {STATUS_KEYS.map(({ key }) => {
                    const count = byStatus?.[key] ?? 0;
                    const pct = total ? (count / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                        <div
                            key={key}
                            title={`${key}: ${count}`}
                            style={{ ...styles.barSegment, width: `${pct}%`, backgroundColor: STATUS_COLORS[key] }}
                        />
                    );
                })}
            </div>
            <div style={styles.legend}>
                {STATUS_KEYS.map(({ key, tKey }) => {
                    const count = byStatus?.[key] ?? 0;
                    if (count === 0) return null;
                    return (
                        <div key={key} style={styles.legendItem}>
                            <span style={{ ...styles.legendDot, backgroundColor: STATUS_COLORS[key] }} />
                            <span style={styles.legendLabel}>{t(tKey)}</span>
                            <span style={styles.legendCount}>{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function StatsPanel({ stats }) {
    const { t } = useLanguage();
    if (!stats) return null;

    const runtime = formatRuntime(stats.total_runtime_minutes);

    const highlights = [
        { labelKey: 'stats_total',    value: stats.total ?? 0,                  subKey: 'stats_in_collection' },
        { labelKey: 'stats_done',     value: stats.by_status?.Completed ?? 0,   subKey: 'stats_finished'      },
        { labelKey: 'stats_reviews',  value: stats.reviews_count ?? 0,           subKey: 'stats_written'       },
        { labelKey: 'stats_lists',    value: stats.lists_count ?? 0,             subKey: 'stats_created'       },
    ];

    return (
        <section style={styles.panel}>
            <h2 style={styles.heading}>{t('stats_title')}</h2>

            {/* Highlight cards */}
            <div style={styles.cards}>
                {highlights.map(({ labelKey, value, subKey }) => (
                    <div key={labelKey} style={styles.card}>
                        <span style={styles.cardValue}>{value}</span>
                        <span style={styles.cardLabel}>{t(labelKey)}</span>
                        <span style={styles.cardSub}>{t(subKey)}</span>
                    </div>
                ))}
            </div>

            {/* Status distribution bar */}
            {stats.total > 0 && (
                <StatusBar byStatus={stats.by_status} total={stats.total} t={t} />
            )}

            {/* Secondary row */}
            <div style={styles.secondaryRow}>
                {/* Movies vs Series */}
                {stats.total > 0 && (
                    <div style={styles.secondaryCard}>
                        <span style={styles.secondaryTitle}>{t('stats_content_type')}</span>
                        <div style={styles.typeRow}>
                            <div style={styles.typeItem}>
                                <span style={styles.typeValue}>{stats.movies_count ?? 0}</span>
                                <span style={styles.typeLabel}>{t('stats_movies')}</span>
                            </div>
                            <div style={styles.typeDivider} />
                            <div style={styles.typeItem}>
                                <span style={styles.typeValue}>{stats.series_count ?? 0}</span>
                                <span style={styles.typeLabel}>{t('stats_series')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Watch time */}
                {runtime && (
                    <div style={styles.secondaryCard}>
                        <span style={styles.secondaryTitle}>{t('stats_watch_time')}</span>
                        <span style={styles.runtimeValue}>{runtime}</span>
                        <span style={styles.runtimeSub}>{t('stats_watch_time_sub')}</span>
                    </div>
                )}

                {/* Average rating */}
                <div style={styles.secondaryCard}>
                    <span style={styles.secondaryTitle}>{t('stats_avg_rating')}</span>
                    <StarRating value={stats.avg_rating} t={t} />
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

    // Highlight cards
    cards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '20px 12px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        textAlign: 'center',
    },
    cardValue: {
        fontSize: '32px',
        fontWeight: '900',
        color: 'var(--text-primary)',
        lineHeight: 1,
    },
    cardLabel: {
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        marginTop: '4px',
    },
    cardSub: {
        fontSize: '11px',
        color: 'var(--text-muted)',
        letterSpacing: '0.3px',
    },

    // Status bar
    barWrap: { marginBottom: '20px' },
    bar: {
        height: '8px',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        backgroundColor: 'var(--bg-elevated)',
        marginBottom: '12px',
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
    legendLabel: { color: 'var(--text-secondary)', fontWeight: '600' },
    legendCount: { color: 'var(--text-primary)', fontWeight: '700' },

    // Secondary row
    secondaryRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
    },
    secondaryCard: {
        flex: '1 1 160px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px 18px',
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

    // Content type
    typeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    typeItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    typeValue: {
        fontSize: '24px',
        fontWeight: '900',
        color: 'var(--text-primary)',
        lineHeight: 1,
    },
    typeLabel: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        fontWeight: '600',
    },
    typeDivider: {
        width: '1px',
        height: '32px',
        backgroundColor: 'var(--bg-elevated)',
    },

    // Watch time
    runtimeValue: {
        fontSize: '24px',
        fontWeight: '900',
        color: 'var(--text-primary)',
        lineHeight: 1,
    },
    runtimeSub: {
        fontSize: '11px',
        color: 'var(--text-muted)',
    },

    // Rating
    starRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
    },
    ratingNum: {
        marginLeft: '6px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-secondary)',
    },
    ratingEmpty: {
        fontSize: '13px',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
    },
};
