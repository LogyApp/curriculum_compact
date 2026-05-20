/**
 * In-memory TTL cache for config endpoints.
 * Config data (tipos, departamentos, EPS, etc.) is essentially static —
 * caching it eliminates DB reads for 95%+ of traffic under high concurrency.
 */

const store = new Map();

/**
 * Get or compute a cached value.
 * @param {string}   key     - Cache key
 * @param {Function} compute - Async function that returns the value
 * @param {number}   ttlMs   - Time-to-live in milliseconds (default 10 min)
 */
export async function cachedGet(key, compute, ttlMs = 10 * 60 * 1000) {
    const entry = store.get(key);
    if (entry && Date.now() - entry.at < ttlMs) {
        return entry.data;
    }
    const data = await compute();
    store.set(key, { data, at: Date.now() });
    return data;
}

/** Explicitly invalidate a cache entry */
export function invalidate(key) {
    store.delete(key);
}

/** Clear all cached entries */
export function clearAll() {
    store.clear();
}

// Auto-cleanup of expired entries every 15 minutes to avoid memory growth
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
        if (now - v.at > 60 * 60 * 1000) store.delete(k); // drop entries older than 1h
    }
}, 15 * 60 * 1000);
