/**
 * Email routes
 * Relocated from: router/correoAspirante.js
 */

import { Router } from 'express';
import { enviarCorreoAspirante } from '../services/email.service.js';

const router = Router();

router.post('/aspirante', async (req, res) => {
    try {
        const { to, nombreCompleto, pdfUrl, isNew } = req.body;
        await enviarCorreoAspirante({ to, nombreCompleto, pdfUrl, isNew: Boolean(isNew) });
        res.json({ ok: true });
    } catch (err) {
        console.error('[correo] Error enviando correo:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
