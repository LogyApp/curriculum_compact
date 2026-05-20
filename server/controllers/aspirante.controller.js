/**
 * Aspirante Controller
 * Handles: GET /api/aspirante, POST /api/hv/registrar,
 *          POST /api/hv/upload-photo, DELETE /api/hv/foto/:id
 *
 * Business logic extracted from server.js.
 */

import { query, getConnection } from '../config/database.js';
import { bucket, bucketFirmas, GCS_BUCKET, GCS_BUCKET_FIRMAS } from '../config/storage.js';
import { generateAndUploadPdf } from '../services/pdf.service.js';
import { enviarCorreoAspirante } from '../services/email.service.js';
import { sanitizeStr, digitsOnly, formatDate, safeInt, escapeHtml } from '../utils/helpers.js';

// ── GET /api/aspirante ───────────────────────────────────────────────────

export async function getAspirante(req, res) {
    const { identificacion } = req.query;
    if (!identificacion) return res.status(400).json({ error: 'Parámetro identificacion requerido' });

    try {
        const [aspirante] = await query('SELECT * FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1', [identificacion]);
        if (!aspirante) return res.json({ existe: false });

        const id = aspirante.id_aspirante;

        // Run all queries in parallel — hijos is isolated to avoid failing the whole response
        // if the migration has not been executed yet (ER_NO_SUCH_TABLE)
        const [educacion, experiencia, familiares, referencias, [contactoEmergencia], [metas], [seguridad]] = await Promise.all([
            query('SELECT institucion, programa, nivel_escolaridad, modalidad, ano, finalizado FROM Dynamic_hv_educacion WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
            query('SELECT empresa, cargo, ano_experiencia, tiempo_laborado, salario, motivo_retiro, funciones FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
            query('SELECT nombre_completo, parentesco, edad, ocupacion, conviven_juntos FROM Dynamic_hv_familiares WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
            query('SELECT tipo_referencia, nombre_completo, telefono, ocupacion, empresa, jefe_inmediato, cargo_jefe FROM Dynamic_hv_referencias WHERE id_aspirante = ? ORDER BY fecha_registro', [id]),
            query('SELECT nombre_completo, parentesco, telefono, correo_electronico, direccion FROM Dynamic_hv_contacto_emergencia WHERE id_aspirante = ? LIMIT 1', [id]),
            query('SELECT meta_corto_plazo, meta_mediano_plazo, meta_largo_plazo FROM Dynamic_hv_metas_personales WHERE id_aspirante = ? LIMIT 1', [id]),
            query('SELECT * FROM Dynamic_hv_seguridad WHERE id_aspirante = ? LIMIT 1', [id]),
        ]);

        // Hijos: separate query with .catch() so a missing table never kills the response
        const hijos = await query(
            'SELECT nombre_completo, edad, conviven_juntos FROM Dynamic_Aspirante_Hijos WHERE id_aspirante = ? ORDER BY fecha_registro',
            [id]
        ).catch(e => {
            if (e.code === 'ER_NO_SUCH_TABLE') {
                console.warn('[aspirante] Dynamic_Aspirante_Hijos not found — run migration 002');
                return [];
            }
            throw e;
        });

        res.json({
            existe: true,
            aspirante,
            educacion,
            experiencia_laboral: experiencia,
            hijos,
            familiares,
            referencias,
            contacto_emergencia: contactoEmergencia || null,
            metas_personales: metas || null,
            seguridad: seguridad || null,
        });
    } catch (err) {
        console.error('[aspirante] getAspirante:', err);
        res.status(500).json({ error: 'Error consultando el aspirante' });
    }
}

// ── POST /api/hv/upload-photo ────────────────────────────────────────────

export async function uploadPhoto(req, res) {
    const { identificacion } = req.body;
    const file = req.file;

    if (!identificacion || !file) return res.status(400).json({ error: 'Faltan datos requeridos' });
    if (!bucket) return res.status(503).json({ error: 'Servicio de almacenamiento no disponible' });

    try {
        const destName = `${identificacion}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        const gcsFile = bucket.file(destName);

        await gcsFile.save(file.buffer, { contentType: file.mimetype, resumable: false });

        let publicUrl;
        try {
            const [url] = await gcsFile.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
            publicUrl = url;
        } catch {
            publicUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${destName}`;
        }

        await query('UPDATE Dynamic_hv_aspirante SET foto_gcs_path = ?, foto_public_url = ? WHERE identificacion = ?', [destName, publicUrl, identificacion]);

        res.json({ ok: true, foto_gcs_path: destName, foto_public_url: publicUrl });
    } catch (err) {
        console.error('[aspirante] uploadPhoto:', err);
        res.status(500).json({ error: 'Error subiendo la foto' });
    }
}

// ── GET /api/hv/firma/:identificacion — proxy for signature image ────────
// Returns the stored signature from GCS as base64 so the frontend can
// draw it on the canvas without CORS restrictions.

export async function getFirmaImage(req, res) {
    const { identificacion } = req.params;
    if (!identificacion) return res.status(400).json({ error: 'Identificacion requerida' });
    if (!bucketFirmas)    return res.status(503).json({ error: 'Servicio no disponible' });

    try {
        const firmaPath = `${identificacion}/firma.png`;
        const file      = bucketFirmas.file(firmaPath);
        const [exists]  = await file.exists();
        if (!exists) return res.status(404).json({ error: 'No hay firma registrada' });

        const [buffer]  = await file.download();
        const base64    = buffer.toString('base64');
        res.json({ base64: `data:image/png;base64,${base64}` });
    } catch (err) {
        console.error('[aspirante] getFirmaImage:', err);
        res.status(500).json({ error: 'Error obteniendo la firma' });
    }
}

// ── DELETE /api/hv/foto/:identificacion ─────────────────────────────────

export async function deleteFoto(req, res) {
    const { identificacion } = req.params;
    if (!identificacion) return res.status(400).json({ error: 'Identificacion requerida' });

    try {
        const [row] = await query('SELECT foto_gcs_path FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1', [identificacion]);
        if (!row) return res.status(404).json({ error: 'Aspirante no encontrado' });

        if (row.foto_gcs_path && bucket) {
            try {
                const [exists] = await bucket.file(row.foto_gcs_path).exists();
                if (exists) await bucket.file(row.foto_gcs_path).delete();
            } catch (gcsErr) {
                console.warn('[aspirante] GCS delete warning:', gcsErr.message);
            }
        }

        await query('UPDATE Dynamic_hv_aspirante SET foto_gcs_path = NULL, foto_public_url = NULL, fecha_actualizacion = NOW() WHERE identificacion = ?', [identificacion]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[aspirante] deleteFoto:', err);
        res.status(500).json({ error: 'Error eliminando la foto' });
    }
}

// ── POST /api/hv/registrar ───────────────────────────────────────────────

export async function registrarHV(req, res) {
    const conn = await getConnection();

    try {
        await conn.beginTransaction();

        const d = req.body;

        // Sanitize core fields
        const id = digitsOnly(d.identificacion || '');
        const tipo = sanitizeStr(d.tipo_documento || '');
        const primerNombre = sanitizeStr(d.primer_nombre);
        const segundoNombre = sanitizeStr(d.segundo_nombre);
        const primerApellido = sanitizeStr(d.primer_apellido);
        const segundoApellido = sanitizeStr(d.segundo_apellido);
        const fechaNac = formatDate(d.fecha_nacimiento);
        const edad = safeInt(d.edad);
        const deptoExp = sanitizeStr(d.departamento_expedicion);
        const ciudadExp = sanitizeStr(d.ciudad_expedicion);
        const fechaExp = formatDate(d.fecha_expedicion);
        const estadoCivil = sanitizeStr(d.estado_civil);
        const direccion = sanitizeStr(d.direccion_barrio);
        const depto = sanitizeStr(d.departamento_residencia);
        const ciudad = sanitizeStr(d.ciudad_residencia);
        const telefono = digitsOnly(d.telefono || '');
        const correo = sanitizeStr(d.correo_electronico);
        const eps = sanitizeStr(d.eps);
        const afp = sanitizeStr(d.afp);
        const rh = sanitizeStr(d.rh);
        const tallaPant = sanitizeStr(d.talla_pantalon);
        const tallaCam = sanitizeStr(d.camisa_talla);
        const tallaZap = sanitizeStr(d.zapatos_talla);
        const fotoPath = sanitizeStr(d.foto_gcs_path);
        const fotoUrl = sanitizeStr(d.foto_public_url);
        const medio = sanitizeStr(d.medio_reclutamiento);
        const recomendador = sanitizeStr(d.recomendador_aspirante);
        const aceptaPrivacidad = d.acepta_privacidad ? 1 : 0;

        if (!id || !tipo) {
            await conn.rollback();
            return res.status(400).json({ ok: false, error: 'Identificación y tipo de documento son requeridos' });
        }

        // Check existing
        const [[existing]] = await conn.query('SELECT id_aspirante, pdf_gcs_path FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1', [id]);
        const isNew = !existing;
        let aspiranteId;

        if (isNew) {
            const [insertResult] = await conn.query(
                `INSERT INTO Dynamic_hv_aspirante
                 (tipo_documento, identificacion, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                  fecha_nacimiento, edad, departamento_expedicion, ciudad_expedicion, fecha_expedicion, estado_civil,
                  direccion_barrio, departamento, ciudad, telefono, correo_electronico, eps, afp, rh,
                  talla_pantalon, camisa_talla, zapatos_talla, foto_gcs_path, foto_public_url,
                  origen_registro, medio_reclutamiento, recomendador_aspirante,
                  acepta_politica_privacidad, fecha_aceptacion_privacidad, fecha_registro)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
                [tipo, id, primerNombre, segundoNombre, primerApellido, segundoApellido,
                    fechaNac, edad, deptoExp, ciudadExp, fechaExp, estadoCivil,
                    direccion, depto, ciudad, telefono, correo, eps, afp, rh,
                    tallaPant, tallaCam, tallaZap, fotoPath || null, fotoUrl || null,
                    'formulario_web', medio, recomendador,
                    aceptaPrivacidad]
            );
            // id_aspirante is char(12) generated by DB default — insertId is not reliable.
            // Fetch the generated value by identificacion (unique key).
            const [[newRow]] = await conn.query(
                'SELECT id_aspirante FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1', [id]
            );
            aspiranteId = newRow.id_aspirante;
        } else {
            aspiranteId = existing.id_aspirante;

            // Delete old PDF from GCS if exists
            if (existing.pdf_gcs_path && bucket) {
                try {
                    const [ex] = await bucket.file(existing.pdf_gcs_path).exists();
                    if (ex) await bucket.file(existing.pdf_gcs_path).delete();
                } catch { }
            }

            await conn.query(
                `UPDATE Dynamic_hv_aspirante SET
                  tipo_documento=?, primer_nombre=?, segundo_nombre=?, primer_apellido=?, segundo_apellido=?,
                  fecha_nacimiento=?, edad=?, departamento_expedicion=?, ciudad_expedicion=?, fecha_expedicion=?,
                  estado_civil=?, direccion_barrio=?, departamento=?, ciudad=?, telefono=?, correo_electronico=?,
                  eps=?, afp=?, rh=?, talla_pantalon=?, camisa_talla=?, zapatos_talla=?,
                  foto_gcs_path=COALESCE(NULLIF(?,NULL), foto_gcs_path),
                  foto_public_url=COALESCE(NULLIF(?,NULL), foto_public_url),
                  origen_registro=?, medio_reclutamiento=?, recomendador_aspirante=?,
                  acepta_politica_privacidad=?,
                  fecha_aceptacion_privacidad=IF(?=1, NOW(), fecha_aceptacion_privacidad),
                  fecha_actualizacion=NOW()
                 WHERE id_aspirante=?`,
                [tipo, primerNombre, segundoNombre, primerApellido, segundoApellido,
                    fechaNac, edad, deptoExp, ciudadExp, fechaExp,
                    estadoCivil, direccion, depto, ciudad, telefono, correo,
                    eps, afp, rh, tallaPant, tallaCam, tallaZap,
                    fotoPath || null, fotoUrl || null,
                    'formulario_web', medio, recomendador,
                    aceptaPrivacidad, aceptaPrivacidad,
                    aspiranteId]
            );
        }

        // Delete child records in parallel (full replace strategy)
        const coreTables = [
            'Dynamic_hv_educacion', 'Dynamic_hv_experiencia_laboral',
            'Dynamic_hv_familiares', 'Dynamic_hv_referencias',
            'Dynamic_hv_contacto_emergencia', 'Dynamic_hv_metas_personales', 'Dynamic_hv_seguridad'
        ];
        await Promise.all(coreTables.map(t => conn.query(`DELETE FROM ${t} WHERE id_aspirante = ?`, [aspiranteId])));

        // Hijos: graceful delete with .catch() on the async rejection
        await conn.query('DELETE FROM Dynamic_Aspirante_Hijos WHERE id_aspirante = ?', [aspiranteId])
            .catch(e => {
                if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
                console.warn('[aspirante] Dynamic_Aspirante_Hijos not found for delete');
            });

        // ── Batch inserts run in parallel for maximum throughput ─────────────
        const insertions = [];

        const educRows = (d.educacion || []).filter(e => sanitizeStr(e.institucion) || sanitizeStr(e.programa));
        if (educRows.length) {
            const vals = educRows.flatMap(e => [aspiranteId, sanitizeStr(e.institucion), sanitizeStr(e.programa), sanitizeStr(e.nivel_escolaridad), sanitizeStr(e.modalidad), safeInt(e.ano, null), safeInt(e.finalizado, 1)]);
            const ph   = educRows.map(() => '(?,?,?,?,?,?,?)').join(',');
            insertions.push(conn.query(`INSERT INTO Dynamic_hv_educacion (id_aspirante,institucion,programa,nivel_escolaridad,modalidad,ano,finalizado) VALUES ${ph}`, vals));
        }

        const expRows = (d.experiencia_laboral || []).filter(x => sanitizeStr(x.empresa) || sanitizeStr(x.cargo));
        if (expRows.length) {
            const vals = expRows.flatMap(x => [aspiranteId, sanitizeStr(x.empresa), sanitizeStr(x.cargo), safeInt(x.ano_experiencia, null), sanitizeStr(x.tiempo_laborado), sanitizeStr(x.salario), sanitizeStr(x.motivo_retiro), sanitizeStr(x.funciones)]);
            const ph   = expRows.map(() => '(?,?,?,?,?,?,?,?)').join(',');
            insertions.push(conn.query(`INSERT INTO Dynamic_hv_experiencia_laboral (id_aspirante,empresa,cargo,ano_experiencia,tiempo_laborado,salario,motivo_retiro,funciones) VALUES ${ph}`, vals));
        }

        const famRows = (d.familiares || []).filter(f => sanitizeStr(f.nombre_completo) || sanitizeStr(f.parentesco));
        if (famRows.length) {
            const vals = famRows.flatMap(f => [aspiranteId, sanitizeStr(f.nombre_completo), sanitizeStr(f.parentesco), safeInt(f.edad, null), sanitizeStr(f.ocupacion), safeInt(f.conviven_juntos, 1)]);
            const ph   = famRows.map(() => '(?,?,?,?,?,?)').join(',');
            insertions.push(conn.query(`INSERT INTO Dynamic_hv_familiares (id_aspirante,nombre_completo,parentesco,edad,ocupacion,conviven_juntos) VALUES ${ph}`, vals));
        }

        const refRows = (d.referencias || []).filter(r => r.tipo_referencia);
        if (refRows.length) {
            const vals = refRows.flatMap(r => [aspiranteId, sanitizeStr(r.tipo_referencia), sanitizeStr(r.empresa), sanitizeStr(r.jefe_inmediato), sanitizeStr(r.cargo_jefe), sanitizeStr(r.nombre_completo), digitsOnly(r.telefono), sanitizeStr(r.ocupacion)]);
            const ph   = refRows.map(() => '(?,?,?,?,?,?,?,?)').join(',');
            insertions.push(conn.query(`INSERT INTO Dynamic_hv_referencias (id_aspirante,tipo_referencia,empresa,jefe_inmediato,cargo_jefe,nombre_completo,telefono,ocupacion) VALUES ${ph}`, vals));
        }

        if (d.contacto_emergencia) {
            const ce = d.contacto_emergencia;
            insertions.push(conn.query('INSERT INTO Dynamic_hv_contacto_emergencia (id_aspirante,nombre_completo,parentesco,telefono,correo_electronico,direccion) VALUES (?,?,?,?,?,?)', [aspiranteId, sanitizeStr(ce.nombre_completo), sanitizeStr(ce.parentesco), digitsOnly(ce.telefono), sanitizeStr(ce.correo_electronico), sanitizeStr(ce.direccion)]));
        }

        if (d.metas_personales) {
            const mp = d.metas_personales;
            insertions.push(conn.query('INSERT INTO Dynamic_hv_metas_personales (id_aspirante,meta_corto_plazo,meta_mediano_plazo,meta_largo_plazo) VALUES (?,?,?,?)', [aspiranteId, sanitizeStr(mp.meta_corto_plazo), sanitizeStr(mp.meta_mediano_plazo), sanitizeStr(mp.meta_largo_plazo)]));
        }

        if (d.seguridad) {
            const s = d.seguridad;
            insertions.push(conn.query(
                `INSERT INTO Dynamic_hv_seguridad (id_aspirante,llamados_atencion,detalle_llamados,accidente_laboral,detalle_accidente,enfermedad_importante,detalle_enfermedad,consume_alcohol,frecuencia_alcohol,familiar_en_empresa,detalle_familiar_empresa,info_falsa,acepta_poligrafo,observaciones,califica_para_cargo,fortalezas,aspectos_mejorar,resolucion_problemas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [aspiranteId, safeInt(s.llamados_atencion), sanitizeStr(s.detalle_llamados), safeInt(s.accidente_laboral), sanitizeStr(s.detalle_accidente), safeInt(s.enfermedad_importante), sanitizeStr(s.detalle_enfermedad), safeInt(s.consume_alcohol), sanitizeStr(s.frecuencia_alcohol), safeInt(s.familiar_en_empresa), sanitizeStr(s.detalle_familiar_empresa), safeInt(s.info_falsa), safeInt(s.acepta_poligrafo), sanitizeStr(s.observaciones), sanitizeStr(s.califica_para_cargo), sanitizeStr(s.fortalezas), sanitizeStr(s.aspectos_mejorar), sanitizeStr(s.resolucion_problemas)]
            ));
        }

        // Run all other inserts in parallel
        await Promise.all(insertions);

        // Hijos: sequential awaited inserts — simpler and more reliable than batch+.catch()
        for (const h of (d.hijos || [])) {
            const nombre = sanitizeStr(h.nombre_completo);
            if (!nombre) continue;
            try {
                await conn.query(
                    'INSERT INTO Dynamic_Aspirante_Hijos (id_aspirante, nombre_completo, edad, conviven_juntos) VALUES (?, ?, ?, ?)',
                    [aspiranteId, nombre, h.edad ? safeInt(h.edad) : null, safeInt(h.conviven_juntos, 1)]
                );
            } catch (e) {
                if (e.code === 'ER_NO_SUCH_TABLE') {
                    console.warn('[aspirante] Dynamic_Aspirante_Hijos missing — run migration 002');
                    break;
                }
                throw e;
            }
        }

        await conn.commit();

        // ── Firma upload — runs after commit so it never blocks the transaction ──
        if (d.firma_base64 && bucketFirmas) {
            try {
                const base64Data = d.firma_base64.replace(/^data:image\/\w+;base64,/, '');
                const buffer     = Buffer.from(base64Data, 'base64');
                const firmaPath  = `${id}/firma.png`;
                await bucketFirmas.file(firmaPath).save(buffer, { contentType: 'image/png', resumable: false });
                const firmaUrl = `https://storage.googleapis.com/${GCS_BUCKET_FIRMAS}/${firmaPath}`;
                await query('UPDATE Dynamic_hv_aspirante SET firma_url = ? WHERE id_aspirante = ?', [firmaUrl, aspiranteId]);
            } catch (firmaErr) {
                console.warn('[aspirante] Signature upload failed:', firmaErr.message);
            }
        }

        // Post-commit: generate PDF and send email (async, don't block response)
        setImmediate(async () => {
            try {
                const fullData = { ...req.body, identificacion: id };
                const { destName, publicUrl } = await generateAndUploadPdf(fullData);

                await query('UPDATE Dynamic_hv_aspirante SET pdf_gcs_path = ?, pdf_public_url = ? WHERE identificacion = ?', [destName, publicUrl, id]);

                // Register document
                await query("INSERT INTO Dynamic_hv_documentos (id_aspirante, id_config_doc, gcs_path, estado, fuente, observaciones) VALUES (?, 30, ?, 'Aprobado', 'Sistema', NULL)", [aspiranteId, destName]);

                // Send email
                const correoAsp = sanitizeStr(req.body.correo_electronico);
                if (correoAsp) {
                    const nombre = `${sanitizeStr(req.body.primer_nombre)} ${sanitizeStr(req.body.primer_apellido)}`.trim();
                    await enviarCorreoAspirante({ to: correoAsp, nombreCompleto: nombre, pdfUrl: publicUrl, isNew });
                }
            } catch (postErr) {
                console.error('[aspirante] Post-commit tasks failed:', postErr.message);
            }
        });

        res.json({ ok: true, success: true, isNew });

    } catch (err) {
        await conn.rollback();
        console.error('[aspirante] registrarHV:', err);
        res.status(500).json({ ok: false, error: 'Error registrando la hoja de vida', details: err.message });
    } finally {
        conn.release();
    }
}
