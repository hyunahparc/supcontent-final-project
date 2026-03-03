import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFilmById } from '../api/films';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export default function FilmDetailPage() {
    const { id } = useParams();
    const [film, setFilm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getFilmById(id)
            .then(setFilm)
            .catch(err => setError(err.response?.data?.message || 'Failed to load film.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p>Loading...</p>;
    if (error)   return <p>{error}</p>;
    if (!film)   return null;

    return (
        <div>
            <div>
                {film.poster_path && (
                    <img
                        src={`${POSTER_BASE}${film.poster_path}`}
                        alt={film.title}
                        width={300}
                    />
                )}
                <div>
                    <h1>{film.title}</h1>
                    <p>{film.release_date?.slice(0, 4)} · {film.runtime} min · ⭐ {film.vote_average?.toFixed(1)}</p>
                    <p>{film.genres?.map(g => g.name).join(', ')}</p>
                    <p>Director: {film.director ?? 'N/A'}</p>
                    <p>{film.overview}</p>
                </div>
            </div>

            <section>
                <h2>Cast</h2>
                <ul>
                    {film.cast?.map(actor => (
                        <li key={actor.id}>
                            {actor.name} — {actor.character}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
