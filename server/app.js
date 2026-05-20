// dotenv/config MUST be the first import in an ES6 module context.
// All `import` declarations are hoisted and evaluated before the module body
// runs, so calling dotenv.config() in the body is too late for modules that
// create a DB pool or read env vars at initialization time.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';

import { rateLimit } from './utils/rateLimit.js';
import configRoutes from './routes/config.routes.js';
import aspiranteRoutes from './routes/aspirante.routes.js';
import correoRoutes from './routes/correo.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Trust proxy (Cloud Run / load balancer) ───────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Gzip compression (built-in zlib, no extra package needed) ────────────
app.use((req, res, next) => {
    const ae = req.headers['accept-encoding'] || '';
    if (!ae.includes('gzip')) return next();

    const originalJson = res.json.bind(res);
    res.json = (data) => {
        const buf = Buffer.from(JSON.stringify(data));
        if (buf.length < 1024) return originalJson(data); // skip small payloads

        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Vary', 'Accept-Encoding');

        const gz = zlib.createGzip({ level: zlib.constants.Z_DEFAULT_COMPRESSION });
        gz.end(buf);

        const chunks = [];
        gz.on('data', c => chunks.push(c));
        gz.on('end', () => res.end(Buffer.concat(chunks)));
        gz.on('error', () => originalJson(data));
    };
    next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────
// General API: 300 req / 1 min per IP
const generalLimit = rateLimit({ max: 300, windowMs: 60 * 1000 });

// Registration endpoint: 20 req / 1 hour per IP
// One person legitimately won't submit their CV 20 times in an hour
const registrarLimit = rateLimit({
    max: 20,
    windowMs: 60 * 60 * 1000,
    message: 'Límite de envíos alcanzado. Por favor espera un momento antes de intentar de nuevo.',
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/config', generalLimit, configRoutes);
app.use('/api/aspirante', generalLimit, aspiranteRoutes);
app.use('/api/hv/registrar', registrarLimit);
app.use('/api', generalLimit, aspiranteRoutes);
app.use('/api/correo', generalLimit, correoRoutes);

// ── Health / status endpoint ──────────────────────────────────────────────
app.get('/connection', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), pid: process.pid });
});

// ── Static frontend (served with cache headers) ───────────────────────────
const frontendRoot = path.join(__dirname, '..');
app.use(express.static(frontendRoot, {
    maxAge: '1h',           // cache static assets 1 hour in browser
    etag: true,
    lastModified: true,
}));

// ── SPA catch-all ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendRoot, 'index.html'));
    }
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[server] Unhandled error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;

// ── Start server ──────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('app.js')) {
    const PORT = parseInt(process.env.PORT || '8080');

    const server = app.listen(PORT, () => {
        console.log(`[server] Running on port ${PORT} | PID ${process.pid}`);
        console.log(`[server] Environment: ${process.env.K_SERVICE ? 'Cloud Run' : 'local'}`);
    });

    // Keep-alive timeout > load balancer idle timeout (Cloud Run = 620 s)
    server.keepAliveTimeout = 650 * 1000;
    server.headersTimeout = 660 * 1000;

    // Graceful shutdown
    const shutdown = (signal) => {
        console.log(`[server] ${signal} received — shutting down gracefully`);
        server.close(() => {
            console.log('[server] HTTP server closed');
            process.exit(0);
        });
        // Force close after 10 s
        setTimeout(() => process.exit(1), 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
