import { apiRequest } from './client';

export function getUserProfile(userId, token) {
  return apiRequest(`/users/${userId}/profile`, { token });
}

export function getUserStats(userId, token) {
  return apiRequest(`/users/${userId}/stats`, { token });
}

export function updateMyProfile({ username, bio, link }, token) {
  return apiRequest('/users/me/profile', {
    method: 'PUT',
    token,
    body: JSON.stringify({ username, bio, link }),
  });
}

export function updateLanguage(language, token) {
  return apiRequest('/users/me/language', {
    method: 'PUT',
    token,
    body: JSON.stringify({ language }),
  });
}

export function uploadAvatar(image, token) {
  const formData = new FormData();
  const extension = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = image.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`;

  formData.append('avatar', {
    uri: image.uri,
    name: `avatar.${extension}`,
    type: mimeType,
  });

  return apiRequest('/users/me/avatar', {
    method: 'POST',
    token,
    body: formData,
  });
}
