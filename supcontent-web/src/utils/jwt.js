// Lightweight client-side JWT helpers.
// The client cannot verify the signature (it has no secret), so these are only
// used to drop an obviously-expired token on boot. The server stays the source
// of truth and still rejects bad tokens with 401.

function decodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;

        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(json);
    } catch {
        return null;
    }
}

// Returns true only when we can read an `exp` claim that is in the past.
// If the token can't be decoded or has no `exp`, we return false and let the
// server decide (the 401 interceptor remains the safety net).
export function isTokenExpired(token) {
    if (!token) return true;

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;

    return payload.exp * 1000 <= Date.now();
}
