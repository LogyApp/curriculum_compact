/** Escape HTML special characters to prevent injection */
export function escapeHtml(str = '') {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Sanitize a string — strip dangerous chars */
export function sanitizeStr(val) {
    if (!val) return '';
    return String(val).trim().replace(/[<>]/g, '');
}

/** Keep only digits */
export function digitsOnly(val) {
    return String(val ?? '').replace(/\D/g, '');
}

/** Format a date value to YYYY-MM-DD or null */
export function formatDate(val) {
    if (!val) return null;
    const part = String(val).split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return null;
    return part;
}

/** Parse int safely, default 0 */
export function safeInt(val, fallback = 0) {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
}
