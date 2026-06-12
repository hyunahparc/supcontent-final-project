// Profile page — /users/:id/profile (own profile and public profiles)
import { useEffect, useState } from 'react';
import { Navigate, useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, getUserStats } from '../api/users';
import { getMyLists, getUserPublicLists } from '../api/lists';
import { getLibrary } from '../api/collections';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../api/follows';
import { mediaHref } from '../utils/media';
import ProfileStatsPanel from '../components/profile/ProfileStatsPanel';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

export default function DashboardPage() {
    const { id } = useParams();
    const { user, logout } = useAuth();
    const { language, t } = useLanguage();
    const navigate = useNavigate();

    const resolvedId = Number(id);
    const isOwnProfile = resolvedId === user?.user_id;

    const [profile, setProfile] = useState(null);
    const [lists, setLists] = useState([]);
    const [collection, setCollection] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [showUnfollowMenu, setShowUnfollowMenu] = useState(false);

    // Modal state: null, followers, or following.
    const [modal, setModal] = useState(null);
    const [modalUsers, setModalUsers] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        if (!resolvedId) {
            navigate('/login', { replace: true });
            return;
        }

        setLoading(true);
        Promise.all([
            getUserProfile(resolvedId),
            getLibrary(resolvedId).catch(() => []),
            (isOwnProfile ? getMyLists() : getUserPublicLists(resolvedId)).catch(() => []),
            getUserStats(resolvedId).catch(() => null),
        ])
            .then(([prof, col, userLists, userStats]) => {
                setProfile(prof);
                setCollection(col.slice(0, 6));
                setLists(userLists ?? []);
                setStats(userStats);
            })
            .catch(() => setError(t('profile_unable_load')))
            .finally(() => setLoading(false));
    }, [resolvedId, isOwnProfile]);

    const handleFollow = async () => {
        if (!user) return navigate('/login');
        setFollowLoading(true);
        try {
            await followUser(resolvedId);
            setProfile(p => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async () => {
        setFollowLoading(true);
        setShowUnfollowMenu(false);
        try {
            await unfollowUser(resolvedId);
            setProfile(p => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
        } finally {
            setFollowLoading(false);
        }
    };

    const openModal = async (type) => {
        setModal(type);
        setModalLoading(true);
        try {
            const data = type === 'followers'
                ? await getFollowers(resolvedId)
                : await getFollowing(resolvedId);
            setModalUsers(data);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => { setModal(null); setModalUsers([]); };

    if (loading) return <div style={s.state}>{t('profile_loading')}</div>;
    if (error)   return <div style={s.state}>{error}</div>;
    if (!profile) return null;
    if (isOwnProfile && user?.is_admin) return <Navigate to="/admin/moderation" replace />;

    const dateLocale = language === 'fr' ? 'fr-FR' : 'en-US';
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' })
        : null;

    return (
        <div style={s.page}>

            {/* Profile card */}
            <div style={s.profileCard}>
                <div style={s.avatarWrap}>
                    {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.username} style={s.avatar} />
                    ) : (
                        <div style={s.avatarFallback}>
                            {profile.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                    )}
                </div>

                <div style={s.profileInfo}>
                    <h1 style={s.username}>{profile.username}</h1>
                    {memberSince && <p style={s.memberSince}>{t('profile_member_since')} {memberSince}</p>}

                    {profile.bio ? (
                        <p style={s.bio}>{profile.bio}</p>
                    ) : (
                        <p style={{ ...s.bio, ...s.bioEmpty }}>{t('profile_no_bio')}</p>
                    )}

                    {profile.link && (
                        <a
                            href={profile.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.profileLink}
                        >
                            {profile.link.replace(/^https?:\/\//, '')}
                        </a>
                    )}

                    <div style={s.socialRow}>
                        <button style={s.socialBtn} onClick={() => openModal('followers')}>
                            <span style={s.socialNumber}>{profile.followers_count ?? 0}</span>
                            <span style={s.socialLabel}>{t('profile_followers')}</span>
                        </button>
                        <div style={s.socialDivider} />
                        <button style={s.socialBtn} onClick={() => openModal('following')}>
                            <span style={s.socialNumber}>{profile.following_count ?? 0}</span>
                            <span style={s.socialLabel}>{t('profile_following')}</span>
                        </button>
                    </div>
                </div>

                {/* Own profile: edit button — Other profile: follow/unfollow */}
                {isOwnProfile ? (
                    <Link to="/settings/profile" style={s.editBtn}>{t('profile_edit')}</Link>
                ) : user && (
                    <div style={s.followWrap}>
                        {profile.is_following ? (
                            <>
                                <button onClick={() => setShowUnfollowMenu(v => !v)} disabled={followLoading} style={s.followingBtn}>
                                    {t('profile_following_btn')}
                                </button>
                                {showUnfollowMenu && (
                                    <div style={s.unfollowMenu}>
                                        <button onClick={handleUnfollow} style={s.unfollowMenuItem}>{t('profile_unfollow')}</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button onClick={handleFollow} disabled={followLoading} style={s.followBtn}>
                                {t('profile_follow')}
                            </button>
                        )}
                    </div>
                )}
            </div>


            {/* Statistics */}
            {stats && <ProfileStatsPanel stats={stats} />}

            {/* Collection preview */}
            <section style={s.section}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>
                        {isOwnProfile ? t('profile_my_collection') : `${profile.username}`}
                    </h2>
                    <Link to={`/users/${resolvedId}/collection`} style={s.seeAllLink}>
                        {t('profile_see_all')} ({profile.media_count ?? 0})
                    </Link>
                </div>
                {collection.length === 0 ? (
                    <p style={s.emptyText}>{t('profile_no_media')}</p>
                ) : (
                    <div style={s.posterGrid}>
                        {collection.map(item => {
                            const poster = item.full_data?.poster_path;
                            return (
                                <Link key={item.collection_id} to={mediaHref(item)} style={s.posterWrap}>
                                    {poster ? (
                                        <img src={`${TMDB_IMG}${poster}`} alt={item.full_data?.title ?? ''} style={s.poster} />
                                    ) : (
                                        <div style={s.posterFallback}>🎬</div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Lists */}
            <section style={s.section}>
                    <div style={s.sectionHeader}>
                        <h2 style={s.sectionTitle}>
                            {isOwnProfile ? t('profile_my_lists') : `${profile.username}`}
                        </h2>
                        {isOwnProfile
                            ? <Link to="/lists" style={s.seeAllLink}>{t('profile_see_all')} ({lists.length})</Link>
                            : <span style={s.seeAllLink}>{lists.length} {t('profile_lists')}</span>
                        }
                    </div>
                    {lists.length === 0 ? (
                        <p style={s.emptyText}>{t('profile_no_lists')}</p>
                    ) : (
                    <div style={s.listsGrid}>
                        {lists.map(list => (
                            <Link key={list.list_id} to={`/lists/${list.list_id}`} style={s.listCard}>
                                <div style={s.listPosterStack}>
                                    {[0, 1, 2, 3].map(i => {
                                        const p = list.preview_posters?.[i];
                                        const isLast = i === 3;
                                        return (
                                            <div key={i} style={{
                                                position: 'absolute',
                                                left: `${i * 95}px`,
                                                right: isLast ? 0 : 'auto',
                                                zIndex: 4 - i,
                                                width: isLast ? 'auto' : '120px',
                                                height: '100%',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                boxShadow: '-4px 0 12px rgba(0,0,0,0.7)',
                                            }}>
                                                {p ? (
                                                    <img src={`${TMDB_IMG}${p}`} alt="" style={s.listPoster} />
                                                ) : (
                                                    <div style={s.listPosterFallback} />
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div style={s.listOverlayInner}>
                                        <div style={s.listName}>{list.name}</div>
                                        <div style={s.listCount}>{list.media_count ?? 0} {t('profile_items')}</div>
                                    </div>
                                </div>
                                <div style={s.listInfo}>
                                    <div style={s.listName}>{list.name}</div>
                                    <div style={s.listCount}>{list.media_count ?? 0} {t('profile_items')}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    )}
                </section>


            {/* Logout */}
            {isOwnProfile && (
                <div style={s.logoutWrap}>
                    <button onClick={() => { logout(); navigate('/login'); }} style={s.logoutBtn}>
                        {t('profile_sign_out')}
                    </button>
                </div>
            )}

            {/* Followers / following modal */}
            {modal && (
                <div style={s.overlay} onClick={closeModal}>
                    <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h2 style={s.modalTitle}>{modal === 'followers' ? t('profile_followers_title') : t('profile_following_title')}</h2>
                            <button style={s.modalClose} onClick={closeModal}>✕</button>
                        </div>
                        {modalLoading ? (
                            <p style={s.modalEmpty}>{t('profile_loading')}</p>
                        ) : modalUsers.length === 0 ? (
                            <p style={s.modalEmpty}>{t('profile_no_users')}</p>
                        ) : (
                            <ul style={s.userList}>
                                {modalUsers.map(u => (
                                    <li key={u.user_id}>
                                        <Link to={`/users/${u.user_id}/profile`} style={s.userLink} onClick={closeModal}>
                                            {u.avatar ? (
                                                <img src={u.avatar} alt={u.username} style={s.miniAvatar} />
                                            ) : (
                                                <div style={s.miniAvatarFallback}>
                                                    {u.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span style={s.userUsername}>{u.username}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    page: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '48px 32px 80px',
        fontFamily: font,
        color: 'var(--text-primary)',
        minHeight: '100vh',
    },
    state: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        fontFamily: font,
    },

    // Profile card
    profileCard: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '32px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
        padding: '36px',
        marginBottom: '40px',
        flexWrap: 'wrap',
    },
    avatarWrap: { flexShrink: 0 },
    avatar: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid var(--border)',
    },
    avatarFallback: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        border: '3px solid var(--border)',
    },
    profileInfo: { flex: 1, minWidth: '200px' },
    username: { margin: '0 0 4px', fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px' },
    memberSince: { margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary)' },
    bio: { margin: '0 0 20px', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: '480px' },
    bioEmpty: { color: 'var(--text-muted)', fontStyle: 'italic' },
    profileLink: {
        display: 'inline-block',
        margin: '-12px 0 18px',
        fontSize: '13px',
        color: 'var(--accent)',
        textDecoration: 'none',
        fontWeight: '600',
        maxWidth: '320px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    socialRow: { display: 'flex', alignItems: 'center', gap: '20px' },
    socialBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, gap: '2px',
    },
    socialNumber: { fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
    socialLabel: { fontSize: '12px', color: 'var(--text-secondary)' },
    socialDivider: { width: '1px', height: '36px', backgroundColor: 'var(--bg-elevated)' },

    editBtn: {
        padding: '10px 22px',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
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
    followWrap: { position: 'relative', alignSelf: 'flex-start', flexShrink: 0 },
    followBtn: {
        padding: '10px 28px', border: 'none', borderRadius: '9999px',
        backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', fontSize: '13px', fontWeight: '700',
        cursor: 'pointer', fontFamily: font, letterSpacing: '0.5px',
    },
    followingBtn: {
        padding: '10px 28px', border: '1px solid var(--border-visible)', borderRadius: '9999px',
        backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700',
        cursor: 'pointer', fontFamily: font, letterSpacing: '0.5px',
    },
    unfollowMenu: {
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)',
        overflow: 'hidden', zIndex: 10, minWidth: '140px',
    },
    unfollowMenuItem: {
        display: 'block', width: '100%', padding: '12px 16px',
        background: 'none', border: 'none', color: '#f3727f',
        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        fontFamily: font, textAlign: 'left',
    },

    // Sections
    section: { marginBottom: '40px' },
    sectionHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
    },
    sectionTitle: { margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
    seeAllLink: { fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '600' },
    emptyText: { color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', margin: 0 },

    // Collection preview
    posterGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px',
    },
    posterWrap: {
        borderRadius: '8px', overflow: 'hidden', display: 'block',
        aspectRatio: '2 / 3', backgroundColor: 'var(--bg-elevated)',
    },
    poster: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    posterFallback: {
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', backgroundColor: 'var(--bg-elevated)',
    },

    // Lists
    listsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
    listCard: {
        textDecoration: 'none', cursor: 'pointer', display: 'flex',
        flexDirection: 'column', borderRadius: '8px', overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
    },
    listPosterStack: { position: 'relative', height: '180px', borderRadius: '6px', overflow: 'hidden' },
    listPoster: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    listPosterFallback: { width: '100%', height: '100%', backgroundColor: 'var(--bg-secondary)' },
    listOverlayInner: { display: 'none' },
    listInfo: { padding: '10px 12px', backgroundColor: 'var(--bg-secondary)' },
    listName: {
        fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px',
    },
    listCount: { fontSize: '12px', color: 'var(--text-secondary)' },

    // Logout
    logoutWrap: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '24px',
        borderTop: '1px solid var(--border)',
        marginTop: '8px',
    },
    logoutBtn: {
        padding: '10px 32px',
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-subtle)',
        borderRadius: '9999px',
        cursor: 'pointer',
        fontFamily: font,
        letterSpacing: '0.5px',
    },

    // Modal
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    },
    modalBox: {
        backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px',
        width: '360px', maxHeight: '70vh', overflowY: 'auto',
    },
    modalHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px',
    },
    modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' },
    modalClose: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', padding: 0 },
    modalEmpty: { color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '20px 0' },
    userList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
    userLink: { display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' },
    miniAvatar: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
    miniAvatarFallback: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0,
    },
    userUsername: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' },
};
