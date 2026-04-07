import client from './client';

export const getFilmById = (id) => client.get(`/films/${id}`);

export const searchMedia = (query, type = 'all', limit = 10, signal) =>
  client.get('/search', {
    params: { q: query.trim(), type, limit },
    signal,
  }).then((data) => data.results ?? []);

// MOCK déclaré AVANT getTrending (const n'est pas hoisté)
const MOCK_TRENDING = [
  { external_id: 550,   media_type: 'Movie',  title: 'Fight Club',               poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', vote_average: 8.4, release_date: '1999-10-15' },
  { external_id: 13,    media_type: 'Movie',  title: 'Forrest Gump',             poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', vote_average: 8.5, release_date: '1994-07-06' },
  { external_id: 238,   media_type: 'Movie',  title: 'The Godfather',            poster_path: '/3bhkrj58Vtu7enYsLlegltE3kon.jpg', vote_average: 8.7, release_date: '1972-03-14' },
  { external_id: 680,   media_type: 'Movie',  title: 'Pulp Fiction',             poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', vote_average: 8.5, release_date: '1994-09-10' },
  { external_id: 155,   media_type: 'Movie',  title: 'The Dark Knight',          poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', vote_average: 8.5, release_date: '2008-07-18' },
  { external_id: 278,   media_type: 'Movie',  title: 'The Shawshank Redemption', poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', vote_average: 8.7, release_date: '1994-09-23' },
  { external_id: 1396,  media_type: 'Series', title: 'Breaking Bad',             poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',  vote_average: 8.9, release_date: '2008-01-20' },
  { external_id: 1399,  media_type: 'Series', title: 'Game of Thrones',          poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', vote_average: 8.4, release_date: '2011-04-17' },
  { external_id: 66732, media_type: 'Series', title: 'Stranger Things',          poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',  vote_average: 8.6, release_date: '2016-07-15' },
  { external_id: 1668,  media_type: 'Series', title: 'Friends',                  poster_path: '/f496cm9enuEsZkSPzCwnTESEK5s.jpg',  vote_average: 8.4, release_date: '1994-09-22' },
  { external_id: 94997, media_type: 'Series', title: 'House of the Dragon',      poster_path: '/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg',  vote_average: 8.4, release_date: '2022-08-21' },
  { external_id: 60625, media_type: 'Series', title: 'Rick and Morty',           poster_path: '/gdIrmf2DdY5mgN6ycVP0XlzKzbE.jpg',  vote_average: 8.7, release_date: '2013-12-02' },
];

export const getTrending = (type = 'all', limit = 12) =>
  Promise.resolve(
    MOCK_TRENDING
      .filter(item => type === 'all' || item.media_type === type)
      .slice(0, limit)
  );