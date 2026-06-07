// src/App.jsx
// Main application routes

import { Routes, Route } from 'react-router-dom';

import MediaDetailPage from './pages/MediaDetailPage';
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
import AdvancedSearchPage from './pages/AdvancedSearchPage';

import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
    return (
        <>
            <Header />

            <Routes>
                <Route path="/" element={<HomePage />} />

                {/* Advanced search — accessible from /search?q=...&type=...&year=... */}
                <Route path="/search" element={<AdvancedSearchPage />} />

                <Route path="/movie/:id" element={<MediaDetailPage mediaType="Movie" />} />
                <Route path="/tv/:id" element={<MediaDetailPage mediaType="Series" />} />
                <Route path="/users/:id/collection" element={<CollectionPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* Profile */}
                <Route path="/users/:id/profile" element={<DashboardPage />} />
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/lists/:id" element={<ListDetailPage />} />
            </Routes>

            <Footer />
        </>
    );
}
