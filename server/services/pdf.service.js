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
 * @param {object} aspiranteData - Full aspirant data object (raw req.body shape)
 * @returns {{ destName: string, publicUrl: string }}
 */
export async function generateAndUploadPdf(aspiranteData) {
    const htmlTemplate = await fs.readFile(TEMPLATE_PATH, 'utf-8');

    // Replace placeholders in the template
    const htmlContent = fillTemplate(htmlTemplate, buildTemplateData(aspiranteData));

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

// ── HTML list builders (ported from legacy pdf-generator flow) ───────────

function toHtmlList(items, renderer) {
    if (!Array.isArray(items) || items.length === 0) return `<div class="muted">No registrado</div>`;
    return items.map((it, i) => `<div><strong>${i + 1}.</strong> ${renderer(it)}</div>`).join('');
}

function siNo(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    return valor == 1 || valor === true || valor === 'true' ? 'Sí' : 'No';
}

// ── Build the flat MAYÚSCULA key/value map expected by cv_template.html ──

function buildTemplateData(d) {
    const educacion = Array.isArray(d.educacion) ? d.educacion : [];
    const experiencia_laboral = Array.isArray(d.experiencia_laboral) ? d.experiencia_laboral : [];
    const referencias = Array.isArray(d.referencias) ? d.referencias : [];
    const familiares = Array.isArray(d.familiares) ? d.familiares : [];
    const contacto = d.contacto_emergencia || {};
    const metas = d.metas_personales || {};
    const seguridad = d.seguridad || {};

    const EDUCACION_LIST = toHtmlList(
        educacion,
        e => `${escapeHtml(e.institucion || '')} — ${escapeHtml(e.programa || '')} (${escapeHtml(e.modalidad || '-')}) ${e.ano ? `• ${escapeHtml(String(e.ano))}` : ''}`
    );

    const EXPERIENCIA_LIST = toHtmlList(experiencia_laboral, ex => {
        const anoIni = ex.ano_experiencia ? escapeHtml(String(ex.ano_experiencia)) : '-';
        const tiempo = escapeHtml(ex.tiempo_laborado || '-');
        const salario = escapeHtml(ex.salario || '-');
        const motivo = escapeHtml(ex.motivo_retiro || '-');
        const funciones = escapeHtml(ex.funciones || '-');
        return `<div><strong>${escapeHtml(ex.empresa || '-')}</strong> — ${escapeHtml(ex.cargo || '-')}<br>` +
            `<span class="muted">Año inicio: ${anoIni} • Tiempo: ${tiempo} • Salario: ${salario}</span><br>` +
            `<span class="muted">Motivo retiro: ${motivo}</span><br>${funciones}</div>`;
    });

    const REFERENCIAS_LIST = toHtmlList(referencias, r => {
        const tipoRaw = (r.tipo_referencia || '').toLowerCase();
        const tipo =
            tipoRaw.includes('laboral') ? 'Referencia laboral' :
                tipoRaw.includes('familiar') ? 'Referencia familiar' :
                    tipoRaw.includes('personal') ? 'Referencia personal' :
                        'Referencia';

        if (tipoRaw.includes('laboral')) {
            return `<div><strong>${escapeHtml(tipo)}:</strong> ${escapeHtml(r.empresa || '-')} — ${escapeHtml(r.jefe_inmediato || '-')} (${escapeHtml(r.telefono || '-')})</div>`;
        }
        const ocup = r.ocupacion ? ` • ${escapeHtml(r.ocupacion)}` : '';
        return `<div><strong>${escapeHtml(tipo)}:</strong> ${escapeHtml(r.nombre_completo || '-')} — ${escapeHtml(r.telefono || '-')}${ocup}</div>`;
    });

    const FAMILIARES_LIST = toHtmlList(
        familiares,
        f => `${escapeHtml(f.nombre_completo || '')} — ${escapeHtml(f.parentesco || '')} • ${escapeHtml(String(f.edad || ''))}`
    );

    const CONTACTO_EMERGENCIA = contacto.nombre_completo
        ? `${escapeHtml(contacto.nombre_completo)} • ${escapeHtml(contacto.telefono || '')} • ${escapeHtml(contacto.correo_electronico || '')}`
        : '';

    const mCorto = String(metas.meta_corto_plazo || '').trim();
    const mMediano = String(metas.meta_mediano_plazo || '').trim();
    const mLargo = String(metas.meta_largo_plazo || '').trim();
    const metasFilas = [];
    if (mCorto) metasFilas.push(`<div><strong>Corto plazo:</strong> ${escapeHtml(mCorto)}</div>`);
    if (mMediano) metasFilas.push(`<div><strong>Mediano plazo:</strong> ${escapeHtml(mMediano)}</div>`);
    if (mLargo) metasFilas.push(`<div><strong>Largo plazo:</strong> ${escapeHtml(mLargo)}</div>`);
    const METAS = metasFilas.length ? metasFilas.join('') : 'No registrado';

    const LUGAR_NACIMIENTO = [d.ciudad_nacimiento, d.departamento_nacimiento, d.pais_nacimiento]
        .filter(Boolean).map(v => escapeHtml(v)).join(' — ');

    const CIUDAD_RESIDENCIA = [d.ciudad_residencia, d.departamento_residencia]
        .filter(Boolean).map(v => escapeHtml(v)).join(' — ');

    return {
        NOMBRE_COMPLETO: `${escapeHtml(d.primer_nombre || '')} ${escapeHtml(d.primer_apellido || '')}`.trim(),
        TIPO_ID: escapeHtml(d.tipo_documento || ''),
        IDENTIFICACION: escapeHtml(d.identificacion || ''),
        CIUDAD_RESIDENCIA,
        TELEFONO: escapeHtml(d.telefono || ''),
        CORREO: escapeHtml(d.correo_electronico || ''),
        DIRECCION: escapeHtml(d.direccion_barrio || ''),
        FECHA_NACIMIENTO: escapeHtml(d.fecha_nacimiento || ''),
        LUGAR_NACIMIENTO,
        FECHA_EXPEDICION: escapeHtml(d.fecha_expedicion || ''),
        ESTADO_CIVIL: escapeHtml(d.estado_civil || ''),
        EPS: escapeHtml(d.eps || ''),
        AFP: escapeHtml(d.afp || ''),
        RH: escapeHtml(d.rh || ''),
        CAMISA_TALLA: escapeHtml(d.camisa_talla || ''),
        TALLA_PANTALON: escapeHtml(d.talla_pantalon || ''),
        ZAPATOS_TALLA: escapeHtml(d.zapatos_talla || ''),
        PHOTO_URL: d.foto_public_url || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
        EDUCACION_LIST,
        EXPERIENCIA_LIST,
        REFERENCIAS_LIST,
        FAMILIARES_LIST,
        CONTACTO_EMERGENCIA,
        METAS,
        FECHA_GENERACION: new Date().toLocaleString('es-CO'),
        LOGO_URL: process.env.LOGO_PUBLIC_URL || 'https://storage.googleapis.com/logyser-recibo-public/logo.png',
        SEG_LLAMADOS: siNo(seguridad.llamados_atencion),
        SEG_DETALLE_LLAMADOS: escapeHtml(seguridad.detalle_llamados || ''),
        SEG_ACCIDENTE: siNo(seguridad.accidente_laboral),
        SEG_DETALLE_ACCIDENTE: escapeHtml(seguridad.detalle_accidente || ''),
        SEG_ENFERMEDAD: siNo(seguridad.enfermedad_importante),
        SEG_DETALLE_ENFERMEDAD: escapeHtml(seguridad.detalle_enfermedad || ''),
        SEG_ALCOHOL: siNo(seguridad.consume_alcohol),
        SEG_FRECUENCIA: escapeHtml(seguridad.frecuencia_alcohol || ''),
        SEG_FAMILIAR: siNo(seguridad.familiar_en_empresa),
        SEG_DETALLE_FAMILIAR: escapeHtml(seguridad.detalle_familiar_empresa || ''),
        SEG_INFO_FALSA: siNo(seguridad.info_falsa),
        SEG_POLIGRAFO: siNo(seguridad.acepta_poligrafo),
        SEG_FORTALEZAS: escapeHtml(seguridad.fortalezas || ''),
        SEG_MEJORAR: escapeHtml(seguridad.aspectos_mejorar || ''),
        SEG_RESOLUCION: escapeHtml(seguridad.resolucion_problemas || ''),
        SEG_OBSERVACIONES: escapeHtml(seguridad.observaciones || ''),
        FIRMA_URL: d.firma_url || '',
    };
}

// ── Template placeholder substitution — {{KEY}} exactly as it is in the template ──

function fillTemplate(html, data) {
    let out = html;
    for (const [key, value] of Object.entries(data)) {
        out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value != null ? String(value) : '');
    }
    return out;
}
