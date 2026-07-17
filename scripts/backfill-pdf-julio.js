/**
 * Backfill puntual: regenera el PDF de los aspirantes cuyo registro se guardó
 * correctamente pero cuya URL de PDF nunca se persistió, por el bug del
 * timeout de 60s en /api/hv/registrar (server.js) entre el 2026-07-09 y su fix.
 *
 * No reenvía correo — solo genera el PDF, lo sube al bucket y completa
 * pdf_gcs_path / pdf_public_url + el registro en Dynamic_hv_documentos.
 *
 * Es idempotente y seguro de re-ejecutar: cada corrida solo toma los
 * registros que TODAVÍA tengan pdf_gcs_path o pdf_public_url en NULL.
 *
 * Debe ejecutarse en un entorno con las mismas variables de entorno de
 * producción (.env con DB_*, y credenciales de GCS: json-key.json local o
 * GOOGLE_APPLICATION_CREDENTIALS / Cloud Run automático).
 *
 * Uso:
 *   node scripts/backfill-pdf-julio.js            → ejecuta el backfill real
 *   node scripts/backfill-pdf-julio.js --dry-run   → solo lista quiénes se procesarían
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';
import { generateAndUploadPdf } from '../pdf-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const FECHA_CORTE = '2026-07-09';

// ── Helpers (idénticos a los de server.js, para que el PDF salga igual) ──

function escapeHtml(str = "") {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function siNo(valor) {
    if (valor === null || valor === undefined) return "";
    return valor == 1 || valor === true || valor === "true" ? "Sí" : "No";
}

function toHtmlList(items, renderer) {
    if (!Array.isArray(items) || items.length === 0) return "<div class='small'>No registrado</div>";
    return items.map((it, i) => `<div class="list-item"><strong>${i + 1}.</strong> ${renderer(it)}</div>`).join("");
}

// ── Conexión a MySQL (misma config que server.js) ────────────────────────

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE,
    port: parseInt(process.env.DB_PORT || process.env.DBPORT || "3306"),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
});

async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

// ── Conexión a GCS (misma lógica que server.js) ──────────────────────────

const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
let storageGcs;
try {
    if (isCloudRun) {
        storageGcs = new Storage();
    } else {
        const keyFilename = path.join(PROJECT_ROOT, 'json-key.json');
        if (fs.existsSync(keyFilename)) {
            storageGcs = new Storage({ keyFilename });
        } else {
            // Sin archivo de llave local: intenta con Application Default
            // Credentials igual (gcloud auth application-default login, o
            // GOOGLE_APPLICATION_CREDENTIALS si está seteada). La librería de
            // Google las descubre sola — no hace falta detectarlas a mano.
            storageGcs = new Storage();
        }
    }
} catch (err) {
    console.error("❌ Error configurando Google Cloud Storage:", err.message);
}

const GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
const bucket = storageGcs ? storageGcs.bucket(GCS_BUCKET) : null;

// ── Construir el aspiranteData (mismo shape que server.js) ───────────────

async function construirAspiranteData(aspirante) {
    const id = aspirante.id_aspirante;

    const [educacion, experiencia_laboral, familiares, referencias, contactoRows, metasRows, seguridadRows] = await Promise.all([
        query('SELECT institucion, programa, nivel_escolaridad, modalidad, ano, finalizado FROM Dynamic_hv_educacion WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
        query('SELECT empresa, cargo, ano_experiencia, tiempo_laborado, salario, motivo_retiro, funciones FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
        query('SELECT nombre_completo, parentesco, edad, ocupacion, conviven_juntos FROM Dynamic_hv_familiares WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
        query('SELECT tipo_referencia, nombre_completo, telefono, ocupacion, empresa, jefe_inmediato, cargo_jefe FROM Dynamic_hv_referencias WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
        query('SELECT nombre_completo, parentesco, telefono, correo_electronico, direccion FROM Dynamic_hv_contacto_emergencia WHERE id_aspirante = ? LIMIT 1', [id]),
        query('SELECT meta_corto_plazo, meta_mediano_plazo, meta_largo_plazo FROM Dynamic_hv_metas_personales WHERE id_aspirante = ? LIMIT 1', [id]),
        query('SELECT * FROM Dynamic_hv_seguridad WHERE id_aspirante = ? LIMIT 1', [id]),
    ]);

    const contacto_emergencia = contactoRows[0] || {};
    const metas_personales = metasRows[0] || {};
    const seguridad = seguridadRows[0] || {};

    const EDUCACION_LIST = toHtmlList(
        educacion,
        e => `${escapeHtml(e.institucion || "")} — ${escapeHtml(e.programa || "")} (${escapeHtml(e.modalidad || "-")}) ${e.ano ? `• ${escapeHtml(String(e.ano))}` : ""}`
    );

    const EXPERIENCIA_LIST = toHtmlList(experiencia_laboral, ex => {
        const anoIni = ex.ano_experiencia ? escapeHtml(String(ex.ano_experiencia)) : "-";
        const tiempo = escapeHtml(ex.tiempo_laborado || "-");
        const salario = escapeHtml(ex.salario || "-");
        const motivo = escapeHtml(ex.motivo_retiro || "-");
        const funciones = escapeHtml(ex.funciones || "-");
        return `
          <div>
            <strong>${escapeHtml(ex.empresa || "-")}</strong> — ${escapeHtml(ex.cargo || "-")}<br>
            <span class="muted">Año inicio: ${anoIni} • Tiempo: ${tiempo} • Salario: ${salario}</span><br>
            <span class="muted">Motivo retiro: ${motivo}</span><br>
            ${funciones}
          </div>
        `;
    });

    const REFERENCIAS_LIST = toHtmlList(referencias, r => {
        const tipoRaw = (r.tipo_referencia || "").toLowerCase();
        const tipo =
            tipoRaw.includes("laboral") ? "Referencia laboral" :
                tipoRaw.includes("familiar") ? "Referencia familiar" :
                    tipoRaw.includes("personal") ? "Referencia personal" :
                        "Referencia";
        if (tipoRaw.includes("laboral")) {
            return `<div><strong>${escapeHtml(tipo)}:</strong> ${escapeHtml(r.empresa || "-")} — ${escapeHtml(r.jefe_inmediato || "-")} (${escapeHtml(r.telefono || "-")})</div>`;
        }
        const ocup = r.ocupacion ? ` • ${escapeHtml(r.ocupacion)}` : "";
        return `<div><strong>${escapeHtml(tipo)}:</strong> ${escapeHtml(r.nombre_completo || "-")} — ${escapeHtml(r.telefono || "-")}${ocup}</div>`;
    });

    const FAMILIARES_LIST = toHtmlList(
        familiares,
        f => `${escapeHtml(f.nombre_completo || "")} — ${escapeHtml(f.parentesco || "")} • ${escapeHtml(String(f.edad || ""))}`
    );

    const CONTACTO_HTML = contacto_emergencia.nombre_completo
        ? `${escapeHtml(contacto_emergencia.nombre_completo)} • ${escapeHtml(contacto_emergencia.telefono || "")} • ${escapeHtml(contacto_emergencia.correo_electronico || "")}`
        : "";

    const mCorto = (metas_personales.meta_corto_plazo || "").trim();
    const mMediano = (metas_personales.meta_mediano_plazo || "").trim();
    const mLargo = (metas_personales.meta_largo_plazo || "").trim();
    const metasFilas = [];
    if (mCorto) metasFilas.push(`<div><strong>Corto plazo:</strong> ${escapeHtml(mCorto)}</div>`);
    if (mMediano) metasFilas.push(`<div><strong>Mediano plazo:</strong> ${escapeHtml(mMediano)}</div>`);
    if (mLargo) metasFilas.push(`<div><strong>Largo plazo:</strong> ${escapeHtml(mLargo)}</div>`);
    const METAS_HTML = metasFilas.length > 0 ? metasFilas.join("") : "No registrado";

    const ciudad_residencia = aspirante.ciudad || "";
    const departamento_residencia = aspirante.departamento || "";

    return {
        NOMBRE_COMPLETO: `${escapeHtml(aspirante.primer_nombre || "")} ${escapeHtml(aspirante.primer_apellido || "")}`.trim(),
        TIPO_ID: escapeHtml(aspirante.tipo_documento || ""),
        IDENTIFICACION: escapeHtml(aspirante.identificacion || ""),
        CIUDAD_RESIDENCIA: escapeHtml([ciudad_residencia, departamento_residencia].filter(Boolean).join(" — ")),
        TELEFONO: escapeHtml(aspirante.telefono || ""),
        CORREO: escapeHtml(aspirante.correo_electronico || ""),
        DIRECCION: escapeHtml(aspirante.direccion_barrio || ""),
        FECHA_NACIMIENTO: escapeHtml(aspirante.fecha_nacimiento ? String(aspirante.fecha_nacimiento).split('T')[0] : ""),
        LUGAR_NACIMIENTO: escapeHtml([aspirante.ciudad_nacimiento, aspirante.departamento_nacimiento, aspirante.pais_nacimiento].filter(Boolean).join(" — ")),
        FECHA_EXPEDICION: escapeHtml(aspirante.fecha_expedicion ? String(aspirante.fecha_expedicion).split('T')[0] : ""),
        ESTADO_CIVIL: escapeHtml(aspirante.estado_civil || ""),
        EPS: escapeHtml(aspirante.eps || ""),
        AFP: escapeHtml(aspirante.afp || ""),
        RH: escapeHtml(aspirante.rh || ""),
        CAMISA_TALLA: escapeHtml(aspirante.camisa_talla || ""),
        TALLA_PANTALON: escapeHtml(aspirante.talla_pantalon || ""),
        ZAPATOS_TALLA: escapeHtml(aspirante.zapatos_talla || ""),
        PHOTO_URL: aspirante.foto_public_url || "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        EDUCACION_LIST,
        EXPERIENCIA_LIST,
        REFERENCIAS_LIST,
        FAMILIARES_LIST,
        CONTACTO_EMERGENCIA: CONTACTO_HTML,
        METAS: METAS_HTML,
        FECHA_GENERACION: new Date().toLocaleString('es-CO'),
        LOGO_URL: process.env.LOGO_PUBLIC_URL || "https://storage.googleapis.com/logyser-recibo-public/logo.png",
        SEG_LLAMADOS: siNo(seguridad.llamados_atencion),
        SEG_DETALLE_LLAMADOS: escapeHtml(seguridad.detalle_llamados || ""),
        SEG_ACCIDENTE: siNo(seguridad.accidente_laboral),
        SEG_DETALLE_ACCIDENTE: escapeHtml(seguridad.detalle_accidente || ""),
        SEG_ENFERMEDAD: siNo(seguridad.enfermedad_importante),
        SEG_DETALLE_ENFERMEDAD: escapeHtml(seguridad.detalle_enfermedad || ""),
        SEG_ALCOHOL: siNo(seguridad.consume_alcohol),
        SEG_FRECUENCIA: escapeHtml(seguridad.frecuencia_alcohol || ""),
        SEG_FAMILIAR: siNo(seguridad.familiar_en_empresa),
        SEG_DETALLE_FAMILIAR: escapeHtml(seguridad.detalle_familiar_empresa || ""),
        SEG_INFO_FALSA: siNo(seguridad.info_falsa),
        SEG_POLIGRAFO: siNo(seguridad.acepta_poligrafo),
        SEG_FORTALEZAS: escapeHtml(seguridad.fortalezas || ""),
        SEG_MEJORAR: escapeHtml(seguridad.aspectos_mejorar || ""),
        SEG_RESOLUCION: escapeHtml(seguridad.resolucion_problemas || ""),
        SEG_OBSERVACIONES: escapeHtml(seguridad.observaciones || ""),
        FIRMA_URL: aspirante.firma_url || "",
    };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🔎 Buscando aspirantes sin PDF desde ${FECHA_CORTE}...\n`);

    const afectados = await query(
        `SELECT * FROM Dynamic_hv_aspirante
         WHERE fecha_registro >= ?
           AND (pdf_gcs_path IS NULL OR pdf_public_url IS NULL)
         ORDER BY fecha_registro ASC`,
        [FECHA_CORTE]
    );

    console.log(`📋 Encontrados: ${afectados.length}`);
    afectados.forEach((a, i) => console.log(`  ${i + 1}. ${a.identificacion} — ${a.primer_nombre} ${a.primer_apellido} (${a.fecha_registro})`));

    if (DRY_RUN) {
        console.log(`\n🧪 --dry-run: no se generó ningún PDF. Corre sin esa bandera para ejecutar el backfill real.\n`);
        await pool.end();
        return;
    }

    if (!bucket) {
        console.error(`\n❌ No hay bucket de GCS configurado/disponible. Aborta y revisa credenciales.\n`);
        await pool.end();
        process.exit(1);
    }

    const exitosos = [];
    const fallidos = [];

    // Secuencial a propósito — generar todos en paralelo es justamente el
    // tipo de contención de recursos que causó el bug original.
    for (const [i, aspirante] of afectados.entries()) {
        const { identificacion, id_aspirante } = aspirante;
        console.log(`\n[${i + 1}/${afectados.length}] Procesando ${identificacion}...`);

        try {
            const dataObjects = await construirAspiranteData(aspirante);

            const pdfResult = await generateAndUploadPdf({
                identificacion,
                dataObjects,
                idHv: id_aspirante,
                bucket,
                bucketName: GCS_BUCKET,
                deleteOldFiles: false, // no había PDF previo que limpiar
            });

            await query(
                `UPDATE Dynamic_hv_aspirante SET pdf_gcs_path = ?, pdf_public_url = ? WHERE identificacion = ?`,
                [pdfResult.destName, pdfResult.publicUrl, identificacion]
            );

            await query(
                `INSERT INTO Dynamic_hv_documentos (id_aspirante, id_config_doc, gcs_path, estado, fuente, observaciones)
                 VALUES (?, 30, ?, 'Aprobado', 'Sistema-Backfill', 'Regenerado por script de backfill 2026-07')`,
                [id_aspirante, pdfResult.destName]
            );

            console.log(`   ✅ PDF generado y guardado: ${pdfResult.destName}`);
            exitosos.push(identificacion);
        } catch (err) {
            console.error(`   ❌ Falló ${identificacion}: ${err.message}`);
            fallidos.push({ identificacion, error: err.message });
        }
    }

    console.log(`\n─────────────────────────────────────────`);
    console.log(`✅ Exitosos: ${exitosos.length}/${afectados.length}`);
    console.log(`❌ Fallidos: ${fallidos.length}/${afectados.length}`);
    if (fallidos.length) {
        console.log(`\nDetalle de fallidos:`);
        fallidos.forEach(f => console.log(`  - ${f.identificacion}: ${f.error}`));
        console.log(`\nVuelve a correr el script — es seguro, solo reprocesará los que sigan sin PDF.`);
    }

    await pool.end();
}

main().catch(async (err) => {
    console.error('❌ Error fatal en el backfill:', err);
    await pool.end();
    process.exit(1);
});
