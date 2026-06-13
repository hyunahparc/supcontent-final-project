function toPositiveNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getClientKey(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({
    windowMs,
    max,
    name = 'default',
    skip = () => false,
    message = 'Too many requests. Please try again later.',
}) {
    const hits = new Map();
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of hits.entries()) {
            if (bucket.resetAt <= now) hits.delete(key);
        }
    }, Math.min(windowMs, 5 * 60 * 1000));

    if (cleanup.unref) cleanup.unref();

    return (req, res, next) => {
        if (skip(req)) return next();

        const now = Date.now();
        const key = `${name}:${getClientKey(req)}`;
        const bucket = hits.get(key);

        if (!bucket || bucket.resetAt <= now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', Math.max(max - 1, 0));
            return next();
        }

        bucket.count += 1;
        const remaining = Math.max(max - bucket.count, 0);
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

        if (bucket.count > max) {
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                message,
                retry_after_seconds: retryAfter,
            });
        }

        return next();
    };
}

module.exports = {
    createRateLimiter,
    toPositiveNumber,
};
