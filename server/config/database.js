import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE,
    port: parseInt(process.env.DB_PORT || process.env.DBPORT || '3306'),

    // ── Connection pool tuning for high concurrency ───────────────────────
    waitForConnections: true,
    connectionLimit: 30,       // max simultaneous connections
    queueLimit: 200,      // max requests waiting for a connection
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    // ── Timeouts ──────────────────────────────────────────────────────────
    connectTimeout: 10000,    // ms to get a new connection
    // idle timeout handled by the server-side wait_timeout

    // ── Character set ─────────────────────────────────────────────────────
    charset: 'utf8mb4',
});

// Log pool events
pool.on('connection', () => {
    // Optional: track active connections count
});

/** Execute a query and return rows */
export async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

/** Get a single connection for transactions */
export async function getConnection() {
    return pool.getConnection();
}
