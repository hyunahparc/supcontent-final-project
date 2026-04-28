import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyLists, createList, updateList, deleteList } from '../api/lists';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w200';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

export default function ListsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newName, setNewName] = useState('');
    const [newPublic, setNewPublic] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        getMyLists()
            .then(setLists)
            .catch(() => setError('Failed to load lists.'))
            .finally(() => setLoading(false));
    }, [user]);

    async function handleCreate(e) {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const created = await createList(newName.trim(), newPublic);
            setLists(prev => [created, ...prev]);
            setNewName('');
            setNewPublic(false);
        } finally {
            setCreating(false);
        }
    }

    async function handleUpdate(listId) {
        if (!editing || !editing.name.trim()) return;
        const updated = await updateList(listId, editing.name.trim(), editing.isPublic);
        setLists(prev => prev.map(l => l.list_id === listId ? { ...l, ...updated } : l));
        setEditing(null);
    }

    async function handleDelete(listId) {
        if (!window.confirm('Delete this list?')) return;
        await deleteList(listId);
        setLists(prev => prev.filter(l => l.list_id !== listId));
    }

    if (loading) return <div style={styles.state}>Loading...</div>;
    if (error) return <div style={styles.state}>{error}</div>;

    return (
        <div style={styles.page}>
            <div style={styles.inner}>
                <h1 style={styles.heading}>My Lists</h1>

                <form onSubmit={handleCreate} style={styles.createForm}>
                    <input
                        style={styles.input}
                        placeholder="New list name…"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <label style={styles.checkLabel}>
                        <input
                            type="checkbox"
                            checked={newPublic}
                            onChange={e => setNewPublic(e.target.checked)}
                            style={{ marginRight: '6px' }}
                        />
                        Public
                    </label>
                    <button type="submit" style={styles.createBtn} disabled={creating || !newName.trim()}>
                        {creating ? 'Creating…' : '+ Create'}
                    </button>
                </form>

                {lists.length === 0 ? (
                    <p style={styles.empty}>No lists yet. Create one above!</p>
                ) : (
                    <div style={styles.grid}>
                        {lists.map(list => (
                            <div key={list.list_id} style={styles.card}>
                                {editing?.listId === list.list_id ? (
                                    <div style={styles.editRow}>
                                        <input
                                            style={styles.editInput}
                                            value={editing.name}
                                            onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
                                            autoFocus
                                        />
                                        <label style={styles.checkLabel}>
                                            <input
                                                type="checkbox"
                                                checked={editing.isPublic}
                                                onChange={e => setEditing(prev => ({ ...prev, isPublic: e.target.checked }))}
                                                style={{ marginRight: '6px' }}
                                            />
                                            Public
                                        </label>
                                        <button style={styles.saveBtn} onClick={() => handleUpdate(list.list_id)}>Save</button>
                                        <button style={styles.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            ...styles.card,
                                            opacity: hoveredId === list.list_id ? 0.8 : 1,
                                            transform: hoveredId === list.list_id ? 'scale(1.03)' : 'scale(1)',
                                            transition: 'opacity 0.15s, transform 0.15s',
                                        }}
                                        onMouseEnter={() => setHoveredId(list.list_id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        <Link to={`/lists/${list.list_id}`} style={styles.cardLink}>
                                            {list.preview_posters?.[0]
                                                ? <img src={`${POSTER_BASE}${list.preview_posters[0]}`} alt="" style={styles.poster} />
                                                : <div style={styles.posterEmpty} />
                                            }
                                            <div style={styles.cardInfo}>
                                                <div style={styles.titleRow}>
                                                    <div style={styles.listName}>{list.name}</div>
                                                    <span style={styles.badge}>{list.is_public ? '🌐' : '🔒'}</span>
                                                </div>
                                                <div style={styles.count}>{list.films_count ?? 0} films</div>
                                            </div>
                                        </Link>

                                        {/* Kebab menu */}
                                        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                                            <button
                                                style={styles.kebabBtn}
                                                onClick={() => setOpenMenu(openMenu === list.list_id ? null : list.list_id)}
                                            >
                                                ···
                                            </button>
                                            {openMenu === list.list_id && (
                                                <div style={styles.kebabMenu}>
                                                    <button
                                                        style={styles.kebabOption}
                                                        onClick={() => { setEditing({ listId: list.list_id, name: list.name, isPublic: list.is_public }); setOpenMenu(null); }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        style={{ ...styles.kebabOption, color: '#e74c3c' }}
                                                        onClick={() => { handleDelete(list.list_id); setOpenMenu(null); }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 40px 60px',
        fontFamily: font,
        backgroundColor: '#121212',
        minHeight: '100vh',
        color: '#fff',
    },
    state: {
        backgroundColor: '#121212',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#b3b3b3',
        fontSize: '14px',
        fontFamily: font,
    },
    inner: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    heading: {
        fontSize: '24px',
        fontWeight: '700',
        margin: '0 0 24px',
    },
    createForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        flexWrap: 'wrap',
    },
    input: {
        flex: 1,
        minWidth: '200px',
        padding: '10px 16px',
        backgroundColor: '#181818',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        fontFamily: font,
        outline: 'none',
    },
    checkLabel: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        color: '#b3b3b3',
        cursor: 'pointer',
    },
    createBtn: {
        padding: '10px 22px',
        backgroundColor: '#1ed760',
        color: '#000',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    empty: {
        color: '#4d4d4d',
        fontSize: '14px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
    },
    card: {
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1f1f1f',
    },
    cardLink: {
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
    },
    poster: {
        width: '100%',
        aspectRatio: '2/3',
        objectFit: 'cover',
        display: 'block',
    },
    posterEmpty: {
        width: '100%',
        aspectRatio: '2/3',
        backgroundColor: '#1f1f1f',
    },
    cardInfo: {
        padding: '10px 12px',
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px',
    },
    listName: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
    },
    badge: {
        fontSize: '13px',
        flexShrink: 0,
    },
    count: {
        fontSize: '13px',
        color: '#b3b3b3',
    },
    kebabBtn: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
        lineHeight: 1,
        letterSpacing: '1px',
    },
    kebabMenu: {
        position: 'absolute',
        top: '40px',
        right: '8px',
        backgroundColor: '#282828',
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        zIndex: 50,
        overflow: 'hidden',
        minWidth: '120px',
    },
    kebabOption: {
        display: 'block',
        width: '100%',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: font,
    },
    editRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        padding: '16px',
    },
    editInput: {
        flex: 1,
        minWidth: '160px',
        padding: '8px 12px',
        backgroundColor: '#222',
        border: '1px solid #444',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '14px',
        fontFamily: font,
        outline: 'none',
    },
    saveBtn: {
        padding: '7px 18px',
        backgroundColor: '#1ed760',
        color: '#000',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    cancelBtn: {
        padding: '7px 18px',
        backgroundColor: 'transparent',
        border: '1px solid #4d4d4d',
        borderRadius: '9999px',
        color: '#b3b3b3',
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: font,
    },
};
