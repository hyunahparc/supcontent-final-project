import { Routes, Route } from 'react-router-dom';
import FilmDetailPage from './pages/FilmDetailPage';

export default function App() {
    return (
        <Routes>
            <Route path="/films/:id" element={<FilmDetailPage />} />
        </Routes>
    );
}
