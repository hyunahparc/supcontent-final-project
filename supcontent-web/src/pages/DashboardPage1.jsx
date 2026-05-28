// Page tableau de bord — profil de l'utilisateur connecté avec statistiques
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserStats } from '../api/users';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

// Ordre d'affichage et couleurs des statuts de collection
const STATUS_CONFIG = [
    { key: 'Terminé',    label: 'Terminé',   color: '#1ed760', emoji: '✅' },
    { key: 'En cours',   label: 'En cours',  color: '#f5a623', emoji: '▶' },
    { key: 'À voir',     label: 'À voir',    color: '#4a9eff', emoji: '🔖' },
    { key: 'Abandonné',  label: 'Abandonné', color: '#f3727f', emoji: '✗'  },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate  = useNavigate();

    const [profile, setProfile] = useState(null);
    const [stats,   setStats]   = useState({});
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    // Redirection si non connecté
    useEffect(() => {
        if (!user) navigate('/login', { replace: true });
    }, [user, navigate]);

    // Chargement du profil et des stats
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        Promise.all([
            getUserProfile(user.user_id),
            getUserStats(user.user_id),
        ])
            .then(([prof, st]) => {
                setProfile(prof);
                setStats(st);
            })
            .catch(() => setError('Impossible de charger le profil.'))
            .finally(() => setLoading(false));
    }, [user]);

    if (!user)    return null;
    if (loading)  return <div style={s.state}>Chargement...</div>;
    if (error)    return <div style={s.state}>{error}</div>;
    if (!profile) return null;

    // Nombre total de films dans la collection
    const totalFilms = Object.values(stats).reduce((sum, n) => sum + n, 0);

    // Date d'inscription formatée
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        : null;

    return (
        <div style={s.page}>

            {/* ── Carte profil ── */}
            <div style={s.profileCard}>

                {/* Avatar */}
                <div style={s.avatarWrap}>
                    {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.username} style={s.avatar} />
                    ) : (
                        <div style={s.avatarFallback}>
                            {profile.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                    )}
                </div>

                {/* Infos textuelles */}
                <div style={s.profileInfo}>
                    <h1 style={s.username}>{profile.username}</h1>

                    {memberSince && (
                        <p style={s.memberSince}>Membre depuis {memberSince}</p>
                    )}

                    {profile.bio ? (
                        <p style={s.bio}>{profile.bio}</p>
                    ) : (
                        <p style={{ ...s.bio, ...s.bioEmpty }}>
                            Aucune biographie pour l'instant.
                        </p>
                    )}

                    {/* Abonnés / abonnements */}
                    <div style={s.socialRow}>
                        <div style={s.socialStat}>
                            <span style={s.socialNumber}>{profile.followers_count ?? 0}</span>
                            <span style={s.socialLabel}>abonné{profile.followers_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={s.socialDivider} />
                        <div style={s.socialStat}>
                            <span style={s.socialNumber}>{profile.following_count ?? 0}</span>
                            <span style={s.socialLabel}>abonnement{profile.following_count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Bouton modifier le profil */}
                <Link to="/settings/profile" style={s.editBtn}>
                    ✏ Modifier le profil
                </Link>
            </div>

            {/* ── Statistiques de collection ── */}
            <section style={s.section}>
                <h2 style={s.sectionTitle}>Ma collection</h2>

                <div style={s.statsGrid}>
                    {/* Total */}
                    <div style={{ ...s.statCard, ...s.statCardTotal }}>
                        <span style={s.statNumber}>{totalFilms}</span>
                        <span style={s.statLabel}>film{totalFilms !== 1 ? 's' : ''} au total</span>
                    </div>

                    {/* Par statut */}
                    {STATUS_CONFIG.map(({ key, label, color, emoji }) => (
                        <Link
                            key={key}
                            to={`/users/${user.user_id}/collection?status=${encodeURIComponent(key)}`}
                            style={{ ...s.statCard, textDecoration: 'none' }}
                        >
                            <span style={{ fontSize: '22px' }}>{emoji}</span>
                            <span style={{ ...s.statNumber, color }}>{stats[key] ?? 0}</span>
                            <span style={s.statLabel}>{label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Actions rapides ── */}
            <section style={s.section}>
                <h2 style={s.sectionTitle}>Actions rapides</h2>
                <div style={s.actionsRow}>
                    <Link to={`/users/${user.user_id}/collection`} style={s.actionCard}>
                        <span style={s.actionIcon}>🎬</span>
                        <span style={s.actionLabel}>Voir ma collection</span>
                    </Link>
                    <Link to="/settings/profile" style={s.actionCard}>
                        <span style={s.actionIcon}>⚙</span>
                        <span style={s.actionLabel}>Paramètres du profil</span>
                    </Link>
                </div>
            </section>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
    page: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '48px 32px 80px',
        fontFamily: font,
        color: '#fff',
        minHeight: '100vh',
    },
    state: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#b3b3b3',
        fontSize: '14px',
        fontFamily: font,
    },

    // ── Carte profil
    profileCard: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '32px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        padding: '36px',
        marginBottom: '40px',
        flexWrap: 'wrap',
    },
    avatarWrap: {
        flexShrink: 0,
    },
    avatar: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid #2a2a2a',
    },
    avatarFallback: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        fontWeight: '700',
        color: '#fff',
        border: '3px solid #2a2a2a',
    },
    profileInfo: {
        flex: 1,
        minWidth: '200px',
    },
    username: {
        margin: '0 0 4px',
        fontSize: '32px',
        fontWeight: '700',
        letterSpacing: '-0.5px',
    },
    memberSince: {
        margin: '0 0 14px',
        fontSize: '13px',
        color: '#b3b3b3',
    },
    bio: {
        margin: '0 0 20px',
        fontSize: '14px',
        color: '#e0e0e0',
        lineHeight: 1.6,
        maxWidth: '480px',
    },
    bioEmpty: {
        color: '#4d4d4d',
        fontStyle: 'italic',
    },
    socialRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    socialStat: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    socialNumber: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
    },
    socialLabel: {
        fontSize: '12px',
        color: '#b3b3b3',
        marginTop: '2px',
    },
    socialDivider: {
        width: '1px',
        height: '36px',
        backgroundColor: '#333',
    },
    editBtn: {
        padding: '10px 22px',
        border: '1px solid #4d4d4d',
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
        textDecoration: 'none',
        letterSpacing: '0.3px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        alignSelf: 'flex-start',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },

    // ── Sections
    section: {
        marginBottom: '40px',
    },
    sectionTitle: {
        margin: '0 0 20px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
    },

    // ── Grille stats
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
    },
    statCard: {
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'default',
        transition: 'background-color 0.15s',
    },
    statCardTotal: {
        border: '1px solid #2a2a2a',
    },
    statNumber: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#fff',
        lineHeight: 1,
    },
    statLabel: {
        fontSize: '12px',
        color: '#b3b3b3',
        textAlign: 'center',
    },

    // ── Actions rapides
    actionsRow: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
    },
    actionCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        padding: '28px 32px',
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        minWidth: '140px',
    },
    actionIcon: {
        fontSize: '28px',
    },
    actionLabel: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
};
