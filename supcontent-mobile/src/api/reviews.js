import { apiRequest } from './client';

export function getReviews(externalId, mediaType = 'Movie', token) {
  const params = new URLSearchParams({ media_type: mediaType });

  return apiRequest(`/reviews/${externalId}?${params.toString()}`, { token });
}

export function getMyReview(externalId, mediaType = 'Movie', token) {
  const params = new URLSearchParams({ media_type: mediaType });

  return apiRequest(`/reviews/${externalId}/my?${params.toString()}`, { token })
    .catch(() => null);
}

export function upsertReview(externalId, mediaType = 'Movie', rating, comment, token) {
  return apiRequest('/reviews', {
    method: 'POST',
    token,
    body: JSON.stringify({
      external_id: externalId,
      media_type: mediaType,
      rating,
      comment,
    }),
  });
}

export function toggleLike(reviewId, token) {
  return apiRequest(`/reviews/${reviewId}/like`, {
    method: 'POST',
    token,
  });
}

export function getComments(reviewId) {
  return apiRequest(`/reviews/${reviewId}/comments`);
}

export function addComment(reviewId, content, token) {
  return apiRequest(`/reviews/${reviewId}/comments`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
  });
}

export function deleteReview(reviewId, token) {
  return apiRequest(`/reviews/${reviewId}`, {
    method: 'DELETE',
    token,
  });
}

export function deleteComment(reviewId, commentId, token) {
  return apiRequest(`/reviews/${reviewId}/comments/${commentId}`, {
    method: 'DELETE',
    token,
  });
}

export function reportReview(reviewId, reason, token) {
  return apiRequest('/moderation/reports', {
    method: 'POST',
    token,
    body: JSON.stringify({ review_id: reviewId, reason: reason ?? null }),
  });
}
