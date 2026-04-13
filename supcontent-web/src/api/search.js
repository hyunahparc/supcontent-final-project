export async function searchMedia(query, type = 'all', limit = 10) {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query.trim(), type, limit });
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();
  return data.results ?? [];
}
