import { Routes, Route } from 'react-router-dom';
import FilmDetailPage from './pages/FilmDetailPage';
import SearchBar from './components/SearchBar';

export default function App() {
    return (
        <>
            <header style={{
                width: '100%',
                padding: '16px 24px',
                borderBottom: '1px solid #eee',
                boxSizing: 'border-box'
            }}>
                <SearchBar />
            </header>
            <main style={{ padding: '24px' }}>
                <Routes>
                    <Route path="/films/:id" element={<FilmDetailPage />} />
                </Routes>
            </main>
        </>
    );
}
