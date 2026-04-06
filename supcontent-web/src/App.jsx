import { Routes, Route } from 'react-router-dom';
import { useNavigate, Link } from 'react-router-dom';
import FilmDetailPage from './pages/FilmDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import SearchBar from './components/SearchBar';
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
                    <SearchBar />
                    <div style={styles.headerRight}>
                        {user ? (
                            <>
                                <span style={styles.username}>{user.username}</span>
                                <button onClick={handleLogout} style={styles.logoutBtn}>
                                    Déconnexion
                                </button>
                            </>
                        ) : (
                            <Link to="/login" style={styles.loginLink}>Se connecter</Link>
                        )}
                    </div>
                </div>
            </header>
            <Routes>
                <Route path="/films/:id" element={<FilmDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            </Routes>
        </>
    );
}

const styles = {
    header: {
        width: '100%',
        padding: '14px 24px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 10,
    },
    headerInner: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
    },
    username: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#444',
    },
    logoutBtn: {
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: '500',
        color: '#555',
        backgroundColor: '#fff',
        border: '1.5px solid #e5e5e5',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    loginLink: {
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#fff',
        backgroundColor: '#111',
        borderRadius: '8px',
        textDecoration: 'none',
    },
};
