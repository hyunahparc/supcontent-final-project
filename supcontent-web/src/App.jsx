import { Routes, Route } from 'react-router-dom';

import FilmDetailPage from './pages/FilmDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import CollectionPage from './pages/CollectionPage';
import DashboardPage from './pages/DashboardPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ListsPage from './pages/ListsPage';
import ListDetailPage from './pages/ListDetailPage';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';

import Header from './components/Header';

export default function App() {
    return (
        <>
            <Header />

            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route path="/films/:id" element={<FilmDetailPage />} />
                <Route path="/users/:id/collection" element={<CollectionPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* ── Profile routes ── */}
                <Route path="/users/:id/profile" element={<DashboardPage />} />
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/lists/:id" element={<ListDetailPage />} />
            </Routes>
        </>
    );
}
