import { apiRequest } from './client';

// List reports by status (pending | resolved | rejected)
export function getReports(status = 'pending', token) {
  return apiRequest(`/moderation/reports?status=${status}`, { token });
}

// Resolve or reject a report
export function updateReportStatus(reportId, status, token) {
  return apiRequest(`/moderation/reports/${reportId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}

// Delete a reported review (also resolves its reports server-side)
export function deleteReportedReview(reviewId, token) {
  return apiRequest(`/moderation/reviews/${reviewId}`, {
    method: 'DELETE',
    token,
  });
}
