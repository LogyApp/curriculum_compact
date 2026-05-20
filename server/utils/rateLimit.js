/**
 * Lightweight in-memory rate limiter (no external dependency).
 * Uses a sliding window per IP address.
 *
 * For production at scale, replace with a Redis-backed solution
 * (e.g. rate-limiter-flexible) so the limit is shared across instances.
 */

const windows = new Map();

// Prune expired windows every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
    for (const [ip, w] of windows.entries()) {
        if (w.start < cutoff) windows.delete(ip);
    }
}, 5 * 60 * 1000);

/**
 * Create a rate-limit middleware.
 * @param {object} opts
 * @param {number} opts.max       - Max requests allowed in the window
 * @param {number} opts.windowMs  - Window size in milliseconds
 * @param {string} [opts.message] - Error message returned to client
 */
export function rateLimit({ max, windowMs, message = 'Demasiadas peticiones. Intenta más tarde.' }) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        let w = windows.get(ip);

        if (!w || now - w.start >= windowMs) {
            w = { count: 1, start: now };
        } else {
            w.count++;
        }
        windows.set(ip, w);

        if (w.count > max) {
            res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
            return res.status(429).json({ error: message });
        }
        next();
    };
}
