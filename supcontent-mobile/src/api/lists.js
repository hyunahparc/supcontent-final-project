import { apiRequest } from './client';

export function getMyLists(token) {
  return apiRequest('/lists', { token });
}

export function getUserPublicLists(userId) {
  return apiRequest(`/users/${userId}/lists`);
}

export function getListById(listId, token) {
  return apiRequest(`/lists/${listId}`, { token });
}

export function createList(name, isPublic = false, token) {
  return apiRequest('/lists', {
    method: 'POST',
    token,
    body: JSON.stringify({ name, is_public: isPublic }),
  });
}

export function updateList(listId, name, isPublic, token) {
  return apiRequest(`/lists/${listId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ name, is_public: isPublic }),
  });
}

export function deleteList(listId, token) {
  return apiRequest(`/lists/${listId}`, {
    method: 'DELETE',
    token,
  });
}

export function removeMediaFromList(listId, externalId, mediaType = 'Movie', token) {
  const params = new URLSearchParams({ media_type: mediaType });

  return apiRequest(`/lists/${listId}/media/${externalId}?${params.toString()}`, {
    method: 'DELETE',
    token,
  });
}

export function addMediaToList(listId, externalId, mediaType = 'Movie', token) {
  return apiRequest(`/lists/${listId}/media`, {
    method: 'POST',
    token,
    body: JSON.stringify({ external_id: externalId, media_type: mediaType }),
  });
}
