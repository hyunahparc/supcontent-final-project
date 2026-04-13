// App.jsx — routage principal et barre de navigation
import { Routes, Route, Navigate } from 'react-router-dom';
import { useNavigate, Link } from 'react-router-dom';

// Pages existantes (inchangées)
import FilmDetailPage    from './pages/FilmDetailPage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import CollectionPage    from './pages/CollectionPage';

// Nouvelles pages
import DashboardPage       from './pages/DashboardPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';

import SearchBar   from './components/SearchBar';
import { useAuth } from './context/AuthContext';

export default function App() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <>
            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div style={styles.headerLeft} />
                    <SearchBar />
                    <div style={styles.headerRight}>
                        {user ? (
                            <>
                                <Link to={`/users/${user.user_id}/collection`} style={styles.navLink}>
                                    Ma collection
                                </Link>
                                <Link to="/dashboard" style={styles.navLink}>
                                    Tableau de bord
                                </Link>
                                {/* Nom cliquable → tableau de bord */}
                                <Link to="/dashboard" style={styles.usernameLink}>
                                    {user.username}
                                </Link>
                                <button onClick={handleLogout} style={styles.logoutBtn}>
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" style={styles.loginLink}>Sign In</Link>
                        )}
                    </div>
                </div>
            </header>

            <Routes>
                {/* ── Route racine : redirige selon l'état de connexion ── */}
                <Route
                    path="/"
                    element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />

                {/* ── Routes existantes (inchangées) ── */}
                <Route path="/films/:id"             element={<FilmDetailPage />} />
                <Route path="/users/:id/collection"  element={<CollectionPage />} />
                <Route path="/login"                 element={<LoginPage />} />
                <Route path="/register"              element={<RegisterPage />} />
                <Route path="/oauth/callback"        element={<OAuthCallbackPage />} />

                {/* ── Nouvelles routes profil ── */}
                <Route path="/dashboard"             element={<DashboardPage />} />
                <Route path="/settings/profile"      element={<ProfileSettingsPage />} />
            </Routes>
        </>
    );
}

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const styles = {
    header: {
        width: '100%',
        padding: '14px 24px',
        borderBottom: '1px solid #1f1f1f',
        backgroundColor: '#121212',
        borderBottom: '1px solid #1f1f1f',
        backgroundColor: '#121212',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        fontFamily: font,
    },
    headerInner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
    },
    navLink: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#b3b3b3',
        textDecoration: 'none',
        letterSpacing: '0.3px',
    },
    usernameLink: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
    },
    logoutBtn: {
        padding: '6px 16px',
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
        backgroundColor: 'transparent',
        border: '1px solid #7c7c7c',
        borderRadius: '9999px',
        cursor: 'pointer',
        letterSpacing: '0.5px',
        fontFamily: font,
    },
    libraryLink: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#b3b3b3',
        textDecoration: 'none',
        letterSpacing: '0.3px',
    },
    loginLink: {
        padding: '8px 20px',
        fontSize: '13px',
        fontWeight: '700',
        color: '#000',
        backgroundColor: '#1ed760',
        borderRadius: '9999px',
        textDecoration: 'none',
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
    },
};
