import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    deleteReportedReview,
    getReports,
    updateReportStatus,
} from '../api/moderation';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

export default function AdminModerationPage() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        if (!user?.is_admin) return;

        setLoading(true);
        setError('');
        getReports('pending')
            .then(setReports)
            .catch((err) => setError(err.response?.data?.message || 'Unable to load reports.'))
            .finally(() => setLoading(false));
    }, [user?.is_admin]);

    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_admin) return <Navigate to={`/users/${user.user_id}/profile`} replace />;

    async function runAction(reportId, action) {
        setBusyId(reportId);
        setError('');
        try {
            await action();
            const nextReports = await getReports('pending');
            setReports(nextReports);
        } catch (err) {
            setError(err.response?.data?.message || 'Admin action failed.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <main style={s.page}>
            <div style={s.header}>
                <div>
                    <p style={s.kicker}>Admin</p>
                    <h1 style={s.title}>Moderation reports</h1>
                </div>
            </div>

            {error && <div style={s.error}>{error}</div>}
            {loading ? (
                <div style={s.state}>Loading reports...</div>
            ) : reports.length === 0 ? (
                <div style={s.state}>No pending reports.</div>
            ) : (
                <div style={s.list}>
                    {reports.map(report => {
                        const busy = busyId === report.report_id;
                        return (
                            <article key={report.report_id} style={s.card}>
                                <div style={s.cardTop}>
                                    <div>
                                        <div style={s.meta}>
                                            Report #{report.report_id} by {report.reporter_username}
                                        </div>
                                        <h2 style={s.reviewTitle}>
                                            Review by {report.author_username}
                                        </h2>
                                    </div>
                                </div>

                                <p style={s.reason}>
                                    <strong>Reason:</strong> {report.reason || 'No reason provided.'}
                                </p>
                                <p style={s.comment}>
                                    {report.review_comment || '(No written comment)'}
                                </p>

                                <div style={s.details}>
                                    <span>Rating: {report.review_rating ?? '-'}</span>
                                    <span>Media: {report.media_type} #{report.external_id}</span>
                                    <span>{new Date(report.created_at).toLocaleString()}</span>
                                </div>

                                <div style={s.actions}>
                                    <button
                                        disabled={busy}
                                        onClick={() => runAction(report.report_id, () => updateReportStatus(report.report_id, 'rejected'))}
                                        style={s.secondaryBtn}
                                    >
                                        Dismiss report
                                    </button>
                                    <button
                                        disabled={busy}
                                        onClick={() => {
                                            if (window.confirm('Delete this review?')) {
                                                runAction(report.report_id, () => deleteReportedReview(report.review_id));
                                            }
                                        }}
                                        style={s.dangerBtn}
                                    >
                                        Delete review
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}

const s = {
    page: {
        maxWidth: '980px',
        margin: '0 auto',
        padding: '48px 32px 80px',
        minHeight: '100vh',
        fontFamily: font,
        color: 'var(--text-primary)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px',
        marginBottom: '24px',
    },
    kicker: {
        margin: '0 0 6px',
        color: 'var(--accent)',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    title: {
        margin: 0,
        fontSize: '32px',
        fontWeight: 700,
    },
    backLink: {
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 700,
        padding: '10px 16px',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
    },
    error: {
        marginBottom: '16px',
        padding: '12px 14px',
        border: '1px solid rgba(243,114,127,0.45)',
        borderRadius: '8px',
        color: '#f3727f',
        backgroundColor: 'rgba(243,114,127,0.08)',
        fontSize: '14px',
    },
    state: {
        padding: '32px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        fontSize: '14px',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    card: {
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '18px',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    meta: {
        color: 'var(--text-secondary)',
        fontSize: '12px',
        marginBottom: '4px',
    },
    reviewTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 700,
    },
    reason: {
        margin: '0 0 10px',
        color: 'var(--text-primary)',
        fontSize: '14px',
    },
    comment: {
        margin: '0 0 12px',
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        fontSize: '14px',
    },
    details: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 16px',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        marginBottom: '14px',
    },
    actions: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    secondaryBtn: {
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        padding: '9px 14px',
        cursor: 'pointer',
        fontFamily: font,
        fontSize: '13px',
        fontWeight: 700,
    },
    dangerBtn: {
        border: '1px solid rgba(243,114,127,0.5)',
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        color: '#f3727f',
        padding: '9px 14px',
        cursor: 'pointer',
        fontFamily: font,
        fontSize: '13px',
        fontWeight: 700,
    },
};
