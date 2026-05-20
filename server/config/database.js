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

/**
 * Run at startup: ensure all required tables exist.
 * Idempotent — uses CREATE TABLE IF NOT EXISTS.
 * Avoids manual migration steps across environments.
 */
export async function runStartupMigrations() {
    try {
        // Migration 001: privacy acceptance columns
        await pool.query(`
            ALTER TABLE Dynamic_hv_aspirante
                ADD COLUMN IF NOT EXISTS acepta_politica_privacidad  TINYINT(1)  NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS fecha_aceptacion_privacidad DATETIME    NULL
        `).catch(() => {}); // ignore if columns already exist (MySQL < 8 doesn't support IF NOT EXISTS on ALTER)

        // Migration 002: hijos table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Dynamic_Aspirante_Hijos (
                id_hijo         INT          NOT NULL AUTO_INCREMENT,
                id_aspirante    CHAR(12)     COLLATE utf8mb4_bin NOT NULL,
                nombre_completo VARCHAR(200) COLLATE utf8mb4_bin NOT NULL,
                edad            TINYINT UNSIGNED DEFAULT NULL,
                conviven_juntos TINYINT(1)   NOT NULL DEFAULT 1,
                fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_hijo),
                INDEX idx_hijos_aspirante (id_aspirante),
                CONSTRAINT fk_hijos_aspirante
                    FOREIGN KEY (id_aspirante)
                    REFERENCES Dynamic_hv_aspirante (id_aspirante)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
        `);

        console.log('[db] Startup migrations OK');
    } catch (err) {
        // Log but don't crash — table may already exist with slight differences
        console.warn('[db] Startup migration warning:', err.message);
    }
}
