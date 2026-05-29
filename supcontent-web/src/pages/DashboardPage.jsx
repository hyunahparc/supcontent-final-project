// Profile page — /users/:id/profile (own profile and public profiles)
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../api/users';
import { getMyLists, getUserPublicLists } from '../api/lists';
import { getLibrary } from '../api/collections';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../api/follows';
import { mediaHref } from '../utils/media';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

export default function DashboardPage() {
    const { id } = useParams();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const resolvedId = Number(id);
    const isOwnProfile = resolvedId === user?.user_id;

    const [profile, setProfile] = useState(null);
    const [lists, setLists] = useState([]);
    const [collection, setCollection] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [showUnfollowMenu, setShowUnfollowMenu] = useState(false);

    // Modal: null | 'followers' | 'following'
    const [modal, setModal]           = useState(null);
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
            getLibrary(resolvedId),
            isOwnProfile ? getMyLists() : getUserPublicLists(resolvedId),
        ])
            .then(([prof, col, userLists]) => {
                setProfile(prof);
                setCollection(col.slice(0, 6));
                setLists(userLists ?? []);
            })
            .catch(() => setError('Unable to load this profile.'))
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

    if (loading) return <div style={s.state}>Loading...</div>;
    if (error)   return <div style={s.state}>{error}</div>;
    if (!profile) return null;

    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : null;

    return (
        <div style={s.page}>

            {/* ── Profile card ── */}
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
                    {memberSince && <p style={s.memberSince}>Member since {memberSince}</p>}

                    {profile.bio ? (
                        <p style={s.bio}>{profile.bio}</p>
                    ) : (
                        <p style={{ ...s.bio, ...s.bioEmpty }}>No bio yet.</p>
                    )}

                    <div style={s.socialRow}>
                        <button style={s.socialBtn} onClick={() => openModal('followers')}>
                            <span style={s.socialNumber}>{profile.followers_count ?? 0}</span>
                            <span style={s.socialLabel}>follower{profile.followers_count !== 1 ? 's' : ''}</span>
                        </button>
                        <div style={s.socialDivider} />
                        <button style={s.socialBtn} onClick={() => openModal('following')}>
                            <span style={s.socialNumber}>{profile.following_count ?? 0}</span>
                            <span style={s.socialLabel}>following</span>
                        </button>
                    </div>
                </div>

                {/* Own profile: edit button — Other profile: follow/unfollow */}
                {isOwnProfile ? (
                    <Link to="/settings/profile" style={s.editBtn}>Edit profile</Link>
                ) : user && (
                    <div style={s.followWrap}>
                        {profile.is_following ? (
                            <>
                                <button onClick={() => setShowUnfollowMenu(v => !v)} disabled={followLoading} style={s.followingBtn}>
                                    Following
                                </button>
                                {showUnfollowMenu && (
                                    <div style={s.unfollowMenu}>
                                        <button onClick={handleUnfollow} style={s.unfollowMenuItem}>Unfollow</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button onClick={handleFollow} disabled={followLoading} style={s.followBtn}>
                                Follow
                            </button>
                        )}
                    </div>
                )}
            </div>


            {/* ── Collection preview ── */}
            <section style={s.section}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>
                        {isOwnProfile ? 'My collection' : `${profile.username}'s collection`}
                    </h2>
                    <Link to={`/users/${resolvedId}/collection`} style={s.seeAllLink}>
                        See all ({profile.media_count ?? 0})
                    </Link>
                </div>
                {collection.length === 0 ? (
                    <p style={s.emptyText}>No media items yet.</p>
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

            {/* ── Lists ── */}
            <section style={s.section}>
                    <div style={s.sectionHeader}>
                        <h2 style={s.sectionTitle}>
                            {isOwnProfile ? 'My lists' : `${profile.username}'s lists`}
                        </h2>
                        {isOwnProfile
                            ? <Link to="/lists" style={s.seeAllLink}>See all ({lists.length})</Link>
                            : <span style={s.seeAllLink}>{lists.length} lists</span>
                        }
                    </div>
                    {lists.length === 0 ? (
                        <p style={s.emptyText}>No lists yet.</p>
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
                                        <div style={s.listCount}>{list.media_count ?? 0} items</div>
                                    </div>
                                </div>
                                <div style={s.listInfo}>
                                    <div style={s.listName}>{list.name}</div>
                                    <div style={s.listCount}>{list.media_count ?? 0} items</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    )}
                </section>


            {/* ── Logout ── */}
            {isOwnProfile && (
                <div style={s.logoutWrap}>
                    <button onClick={() => { logout(); navigate('/login'); }} style={s.logoutBtn}>
                        Sign Out
                    </button>
                </div>
            )}

            {/* ── Followers / Following modal ── */}
            {modal && (
                <div style={s.overlay} onClick={closeModal}>
                    <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h2 style={s.modalTitle}>{modal === 'followers' ? 'Followers' : 'Following'}</h2>
                            <button style={s.modalClose} onClick={closeModal}>✕</button>
                        </div>
                        {modalLoading ? (
                            <p style={s.modalEmpty}>Loading...</p>
                        ) : modalUsers.length === 0 ? (
                            <p style={s.modalEmpty}>No users yet.</p>
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

    // Profile card
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
    avatarWrap: { flexShrink: 0 },
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
    profileInfo: { flex: 1, minWidth: '200px' },
    username: { margin: '0 0 4px', fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px' },
    memberSince: { margin: '0 0 14px', fontSize: '13px', color: '#b3b3b3' },
    bio: { margin: '0 0 20px', fontSize: '14px', color: '#e0e0e0', lineHeight: 1.6, maxWidth: '480px' },
    bioEmpty: { color: '#4d4d4d', fontStyle: 'italic' },
    socialRow: { display: 'flex', alignItems: 'center', gap: '20px' },
    socialBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, gap: '2px',
    },
    socialNumber: { fontSize: '20px', fontWeight: '700', color: '#fff' },
    socialLabel: { fontSize: '12px', color: '#b3b3b3' },
    socialDivider: { width: '1px', height: '36px', backgroundColor: '#333' },

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
    followWrap: { position: 'relative', alignSelf: 'flex-start', flexShrink: 0 },
    followBtn: {
        padding: '10px 28px', border: 'none', borderRadius: '9999px',
        backgroundColor: '#1ed760', color: '#000', fontSize: '13px', fontWeight: '700',
        cursor: 'pointer', fontFamily: font, letterSpacing: '0.5px',
    },
    followingBtn: {
        padding: '10px 28px', border: '1px solid #4d4d4d', borderRadius: '9999px',
        backgroundColor: 'transparent', color: '#fff', fontSize: '13px', fontWeight: '700',
        cursor: 'pointer', fontFamily: font, letterSpacing: '0.5px',
    },
    unfollowMenu: {
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        backgroundColor: '#2a2a2a', borderRadius: '8px', border: '1px solid #3a3a3a',
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
    sectionTitle: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' },
    seeAllLink: { fontSize: '13px', color: '#b3b3b3', textDecoration: 'none', fontWeight: '600' },
    emptyText: { color: '#4d4d4d', fontSize: '14px', fontStyle: 'italic', margin: 0 },

    // Collection preview
    posterGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px',
    },
    posterWrap: {
        borderRadius: '8px', overflow: 'hidden', display: 'block',
        aspectRatio: '2 / 3', backgroundColor: '#2a2a2a',
    },
    poster: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    posterFallback: {
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', backgroundColor: '#2a2a2a',
    },

    // Lists
    listsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
    listCard: {
        textDecoration: 'none', cursor: 'pointer', display: 'flex',
        flexDirection: 'column', borderRadius: '8px', overflow: 'hidden',
        backgroundColor: '#1e1e1e',
    },
    listPosterStack: { position: 'relative', height: '180px', borderRadius: '6px', overflow: 'hidden' },
    listPoster: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    listPosterFallback: { width: '100%', height: '100%', backgroundColor: '#1e1e1e' },
    listOverlayInner: { display: 'none' },
    listInfo: { padding: '10px 12px', backgroundColor: '#1e1e1e' },
    listName: {
        fontSize: '13px', fontWeight: '700', color: '#fff',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px',
    },
    listCount: { fontSize: '12px', color: '#ccc' },

    // Logout
    logoutWrap: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '24px',
        borderTop: '1px solid #2a2a2a',
        marginTop: '8px',
    },
    logoutBtn: {
        padding: '10px 32px',
        fontSize: '13px',
        fontWeight: '700',
        color: '#b3b3b3',
        backgroundColor: 'transparent',
        border: '1px solid #3a3a3a',
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
        backgroundColor: '#1e1e1e', borderRadius: '16px', padding: '28px',
        width: '360px', maxHeight: '70vh', overflowY: 'auto',
    },
    modalHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px',
    },
    modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' },
    modalClose: { background: 'none', border: 'none', color: '#b3b3b3', fontSize: '18px', cursor: 'pointer', padding: 0 },
    modalEmpty: { color: '#b3b3b3', fontSize: '14px', textAlign: 'center', margin: '20px 0' },
    userList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
    userLink: { display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' },
    miniAvatar: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
    miniAvatarFallback: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0,
    },
    userUsername: { fontSize: '14px', fontWeight: '600', color: '#fff' },
};
