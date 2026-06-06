import { apiRequest } from './client';

export function getCollectionStatus(externalId, mediaType = 'Movie', token) {
  const params = new URLSearchParams({ media_type: mediaType });

  return apiRequest(`/collections/${externalId}?${params.toString()}`, { token })
    .then((data) => data?.status ?? null)
    .catch(() => null);
}

export function upsertCollection(externalId, mediaType = 'Movie', status, token) {
  return apiRequest('/collections', {
    method: 'POST',
    token,
    body: JSON.stringify({ external_id: externalId, media_type: mediaType, status }),
  });
}

export function removeFromCollection(externalId, mediaType = 'Movie', token) {
  const params = new URLSearchParams({ media_type: mediaType });

  return apiRequest(`/collections/${externalId}?${params.toString()}`, {
    method: 'DELETE',
    token,
  });
}
