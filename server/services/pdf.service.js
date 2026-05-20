/**
 * PDF Service
 * Generates a CV/HV PDF from the HTML template using Puppeteer
 * and uploads it to Google Cloud Storage.
 *
 * Relocated from: pdf-generator.js
 */

import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { bucket, GCS_BUCKET } from '../config/storage.js';
import { escapeHtml } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template path — relative to project root
const TEMPLATE_PATH = path.join(__dirname, '../../templates/cv_template.html');

/**
 * Generate a PDF from the aspirant data, upload to GCS and return the URL.
 * @param {object} aspiranteData - Full aspirant data object
 * @returns {{ destName: string, publicUrl: string }}
 */
export async function generateAndUploadPdf(aspiranteData) {
    const htmlTemplate = await fs.readFile(TEMPLATE_PATH, 'utf-8');

    // Replace placeholders in the template
    const htmlContent = fillTemplate(htmlTemplate, aspiranteData);

    // Launch headless Chrome
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

        const timestamp = Date.now();
        const id = aspiranteData.identificacion || 'unknown';
        const destName = `${id}/${timestamp}_CV_HV.pdf`;

        if (!bucket) throw new Error('GCS bucket not initialized');

        const file = bucket.file(destName);
        await file.save(pdfBuffer, { contentType: 'application/pdf', metadata: { cacheControl: 'no-cache' } });

        const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${destName}`;
        return { destName, publicUrl };
    } finally {
        await browser.close();
    }
}

// ── Template placeholder substitution ────────────────────────────────────

function fillTemplate(html, d) {
    const ph = (key, fallback = '') => {
        const val = d[key];
        return escapeHtml(val != null && val !== '' ? String(val) : fallback);
    };

    return html
        .replace(/{{primer_nombre}}/g, ph('primer_nombre'))
        .replace(/{{segundo_nombre}}/g, ph('segundo_nombre'))
        .replace(/{{primer_apellido}}/g, ph('primer_apellido'))
        .replace(/{{segundo_apellido}}/g, ph('segundo_apellido'))
        .replace(/{{tipo_documento}}/g, ph('tipo_documento'))
        .replace(/{{identificacion}}/g, ph('identificacion'))
        .replace(/{{fecha_nacimiento}}/g, ph('fecha_nacimiento'))
        .replace(/{{edad}}/g, ph('edad'))
        .replace(/{{estado_civil}}/g, ph('estado_civil'))
        .replace(/{{direccion_barrio}}/g, ph('direccion_barrio'))
        .replace(/{{ciudad}}/g, ph('ciudad'))
        .replace(/{{departamento}}/g, ph('departamento'))
        .replace(/{{telefono}}/g, ph('telefono'))
        .replace(/{{correo_electronico}}/g, ph('correo_electronico'))
        .replace(/{{eps}}/g, ph('eps'))
        .replace(/{{afp}}/g, ph('afp'))
        .replace(/{{rh}}/g, ph('rh'))
        .replace(/{{talla_pantalon}}/g, ph('talla_pantalon'))
        .replace(/{{camisa_talla}}/g, ph('camisa_talla'))
        .replace(/{{zapatos_talla}}/g, ph('zapatos_talla'))
        .replace(/{{foto_public_url}}/g, ph('foto_public_url'))
        .replace(/{{firma_url}}/g, ph('firma_url'))
        .replace(/{{fecha_registro}}/g, ph('fecha_registro'))
        .replace(/{{medio_reclutamiento}}/g, ph('medio_reclutamiento'));
}
