import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Header            from './components/Header';
import Footer            from './components/Footer';
import HomePage          from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import FilmDetailPage    from './pages/FilmDetailPage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ComingSoonPage    from './pages/ComingSoonPage';
import { useAuth }       from './context/AuthContext';

export default function App() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    const handler = () => {
      logout();
      navigate('/login');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout, navigate]);

  return (
    <div style={styles.app}>
      <Header />
      <div style={styles.content}>
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/search"         element={<SearchResultsPage />} />
          <Route path="/films/:id"      element={<FilmDetailPage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

          {/* Pages en cours de développement */}
          <Route path="/films"  element={<ComingSoonPage icon="🎬" title="Films" description="La catalogue complet des films arrive bientôt. En attendant, utilisez la recherche." />} />
          <Route path="/series" element={<ComingSoonPage icon="📺" title="Séries" description="Le catalogue complet des séries arrive bientôt. En attendant, utilisez la recherche." />} />
          <Route path="/top"    element={<ComingSoonPage icon="🏆" title="Top 100" description="Le classement des 100 meilleurs contenus arrive bientôt." />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0a0a',
  },
  content: { flex: 1 },
};