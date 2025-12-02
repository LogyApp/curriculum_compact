// ==========================================================
//  Backend de configuración HV - Logyser
//  Node.js + Express + MySQL (mysql2/promise)
//  Listo para Cloud Run
// ==========================================================
import path from 'path';
import { generateAndUploadPdf } from "./pdf-generator.js"; // agrega import

import multer from "multer";
import { Storage } from "@google-cloud/storage";

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.Router())

import correoAspiranteRoutes from "./router/correoAspirante.js";

// === Servir frontend ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESTABLECER LA VARIABLE DE ENTORNO PRIMERO
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'json-key.json');
console.log('Ruta credenciales:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Luego crea el cliente de Storage UNA SOLA VEZ
const storage = new Storage({
  keyFilename: path.join(__dirname, 'json-key.json')
  // No necesitas projectId aquí si está en el archivo json
});

// ==========================================
//  CONEXIÓN A MYSQL
// ==========================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || '34.162.109.112',
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || 'Logyser2025',
  database: "Desplegables",
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper para consultas
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Helper: escape HTML para textos que iremos inyectando en la plantilla
function escapeHtml(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// Multer: almacenar en memoria para subir directamente a GCS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // límite 5MB (ajusta si quieres)
});

// Google Cloud Storage
const GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
const storageGcs = new Storage(); // usará credenciales por env/Workload Identity en GCP
const bucket = storageGcs.bucket(GCS_BUCKET);

app.get('/connection', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Curriculum Vitae</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .container {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 24px;
        padding: 60px 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 600px;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .status-indicator {
        display: inline-flex;
        align-items: center;
        margin-bottom: 30px;
        padding: 8px 16px;
        background: #10b981;
        color: white;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        animation: pulse 2s infinite;
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        margin-right: 8px;
        animation: blink 1.5s infinite;
      }
      
      h1 {
        color: #1f2937;
        font-size: 36px;
        font-weight: 700;
        margin-bottom: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .subtitle {
        color: #6b7280;
        font-size: 18px;
        margin-bottom: 40px;
        line-height: 1.6;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 40px 0;
      }
      
      .info-card {
        background: #f8fafc;
        padding: 20px;
        border-radius: 12px;
        text-align: left;
        border-left: 4px solid #667eea;
      }
      
      .info-card h3 {
        color: #374151;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .info-card p {
        color: #6b7280;
        font-size: 14px;
      }
      
      .api-endpoints {
        background: #f3f4f6;
        padding: 20px;
        border-radius: 12px;
        margin-top: 30px;
      }
      
      .endpoint {
        display: flex;
        align-items: center;
        padding: 12px;
        background: white;
        border-radius: 8px;
        margin-bottom: 10px;
        border: 1px solid #e5e7eb;
      }
      
      .method {
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        margin-right: 12px;
      }
      
      .method.get {
        background: #10b981;
        color: white;
      }
      
      .method.post {
        background: #f59e0b;
        color: white;
      }
      
      .method.put {
        background: #3b82f6;
        color: white;
      }
      
      .method.delete {
        background: #ef4444;
        color: white;
      }
      
      .endpoint-path {
        font-family: 'Monaco', 'Courier New', monospace;
        color: #374151;
        font-size: 14px;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.8; }
        100% { opacity: 1; }
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .timestamp {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="status-indicator">
        <span class="status-dot"></span>
        SERVER ACTIVE
      </div>
      
      <h1>API Curriculum Vitae</h1>
      <p class="subtitle">
        Servicio backend para generación y gestión de currículums vitae
      </p>
      
      <div class="info-grid">
        <div class="info-card">
          <h3>📊 Estado del Sistema</h3>
          <p>Todas las funciones operativas</p>
        </div>
        <div class="info-card">
          <h3>⚡ Rendimiento</h3>
          <p>Respuesta en tiempo real</p>
        </div>
      </div>
      
      <div class="api-endpoints">
        <h3 style="text-align: left; color: #374151; margin-bottom: 15px;">📡 Endpoints Disponibles</h3>
        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/health</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/generate-pdf</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/send-email</span>
        </div>
      </div>
      
      <div class="timestamp">
        Última actualización: ${new Date().toLocaleString('es-ES')}
      </div>
    </div>
  </body>
  </html>
  `;

  res.status(200).send(html);
});

// ==========================================
//  ENDPOINT: Tipo de Identificación
// ==========================================

app.get("/api/config/tipo-identificacion", async (req, res) => {
  try {
    const rows = await query(`
      SELECT \`Descripción\` AS descripcion
      FROM Config_Tipo_Identificación
      ORDER BY \`Descripción\`
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error tipo identificación:", error);
    res.status(500).json({ error: "Error cargando tipos de identificación" });
  }
});

// ==========================================
//  ENDPOINT: Departamentos (solo Colombia)
// ==========================================

app.get("/api/config/departamentos", async (req, res) => {
  try {
    const rows = await query(`
      SELECT \`Departamento\` AS departamento
      FROM Config_Departamentos
      WHERE \`País\` = 'Colombia'
      ORDER BY \`Departamento\`
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error departamentos:", error);
    res.status(500).json({ error: "Error cargando departamentos" });
  }
});

// ==========================================
//  ENDPOINT: Ciudades por departamento
// ==========================================

app.get("/api/config/ciudades", async (req, res) => {
  const departamento = req.query.departamento;

  if (!departamento) {
    return res.status(400).json({ error: "Falta el parámetro 'departamento'" });
  }

  try {
    const rows = await query(`
      SELECT \`Ciudad\` AS ciudad
      FROM Config_Ciudades
      WHERE \`Departamento\` = ? AND \`Pais\` = 'Colombia'
      ORDER BY \`Ciudad\`
    `, [departamento]);

    res.json(rows);
  } catch (error) {
    console.error("Error ciudades:", error);
    res.status(500).json({ error: "Error cargando ciudades" });
  }
});

// ==========================================
//  ENDPOINT: EPS
// ==========================================

app.get("/api/config/eps", async (req, res) => {
  try {
    const rows = await query(`
      SELECT \`EPS\` AS eps
      FROM Config_EPS
      ORDER BY \`EPS\`
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error EPS:", error);
    res.status(500).json({ error: "Error cargando EPS" });
  }
});

// ==========================================
//  ENDPOINT: Fondo de Pensión
// ==========================================

app.get("/api/config/pension", async (req, res) => {
  try {
    const rows = await query(`
      SELECT \`Fondo de Pensión\` AS pension
      FROM Config_Pensión
      ORDER BY \`Fondo de Pensión\`
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error pensión:", error);
    res.status(500).json({ error: "Error cargando fondos de pensión" });
  }
});


app.use(express.static(__dirname));
// ==========================================
//  INICIO SERVIDOR
// ==========================================


// ======================================================
//  CONSULTAR ASPIRANTE POR IDENTIFICACIÓN (para evitar duplicados)
//  GET /api/aspirante?identificacion=123
// ======================================================
// Reemplazar la ruta GET /api/aspirante por este handler (devuelve aspirante + relaciones)
app.get("/api/aspirante", async (req, res) => {
  const identificacion = req.query.identificacion;

  if (!identificacion) {
    return res.status(400).json({ error: "Falta la identificación" });
  }

  try {
    // 1) Buscar aspirante
    const rows = await query(
      `SELECT * FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
      [identificacion]
    );

    if (rows.length === 0) {
      return res.json({ existe: false });
    }

    const aspirante = rows[0];
    const id = aspirante.id_aspirante;

    // 2) Traer relaciones
    const educacion = await query(
      `SELECT institucion, programa, nivel_escolaridad, modalidad, ano, finalizado
       FROM Dynamic_hv_educacion
       WHERE id_aspirante = ? ORDER BY fecha_registro`,
      [id]
    );

    const experiencia = await query(
      `SELECT empresa, cargo, tiempo_laborado, salario, motivo_retiro, funciones FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ? ORDER BY fecha_registro`,
      [id]
    );

    const familiares = await query(
      `SELECT nombre_completo, parentesco, edad, ocupacion, conviven_juntos FROM Dynamic_hv_familiares WHERE id_aspirante = ? ORDER BY fecha_registro`,
      [id]
    );

    const referencias = await query(
      `SELECT tipo_referencia, nombre_completo, telefono, ocupacion, empresa, jefe_inmediato, cargo_jefe FROM Dynamic_hv_referencias WHERE id_aspirante = ? ORDER BY fecha_registro`,
      [id]
    );

    const contactoRows = await query(
      `SELECT nombre_completo, parentesco, telefono, correo_electronico, direccion FROM Dynamic_hv_contacto_emergencia WHERE id_aspirante = ? LIMIT 1`,
      [id]
    );
    const contacto_emergencia = contactoRows[0] || null;

    const metasRows = await query(
      `SELECT meta_corto_plazo, meta_mediano_plazo, meta_largo_plazo FROM Dynamic_hv_metas_personales WHERE id_aspirante = ? LIMIT 1`,
      [id]
    );
    const metas_personales = metasRows[0] || null;

    const seguridadRows = await query(
      `SELECT llamados_atencion, detalle_llamados, accidente_laboral, detalle_accidente, enfermedad_importante, detalle_enfermedad, consume_alcohol, frecuencia_alcohol, familiar_en_empresa, detalle_familiar_empresa, info_falsa, acepta_poligrafo, observaciones, califica_para_cargo, fortalezas, aspectos_mejorar, resolucion_problemas FROM Dynamic_hv_seguridad WHERE id_aspirante = ? LIMIT 1`,
      [id]
    );
    const seguridad = seguridadRows[0] || null;

    return res.json({
      existe: true,
      aspirante,
      educacion,
      experiencia_laboral: experiencia,
      familiares,
      referencias,
      contacto_emergencia,
      metas_personales,
      seguridad
    });
  } catch (error) {
    console.error("Error consultando aspirante:", error);
    res.status(500).json({ error: "Error consultando datos del aspirante" });
  }
});
// Endpoint: subir foto de perfil al bucket GCS
// Recibe multipart/form-data con campos: identificacion (string) + photo (file)
app.post("/api/hv/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const identificacion = req.body.identificacion;
    const file = req.file;

    if (!identificacion) {
      return res.status(400).json({ ok: false, error: "Falta identificacion en el body" });
    }
    if (!file) {
      return res.status(400).json({ ok: false, error: "Falta archivo 'photo' en el form-data" });
    }

    // Normalizar nombre de archivo y construir objeto con prefijo identificacion/
    const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-\.]/g, "");
    const destName = `${identificacion}/${Date.now()}_${safeName}`;

    const blob = bucket.file(destName);
    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype
      }
    });

    stream.on("error", (err) => {
      console.error("GCS upload error:", err);
      return res.status(500).json({ ok: false, error: "Error subiendo archivo a storage" });
    });

    stream.on("finish", async () => {
      // --- Dentro de stream.on("finish", async () => { ... }) reemplazar la generación/guardado de URL por:
      try {
        const expiresMs = parseInt(process.env.SIGNED_URL_EXPIRES_MS || String(7 * 24 * 60 * 60 * 1000), 10);
        const expiresAt = Date.now() + expiresMs;

        // Intentar crear signed URL
        let signedUrl = null;
        try {
          const [url] = await blob.getSignedUrl({ action: "read", expires: expiresAt });
          signedUrl = url;
        } catch (errSigned) {
          console.warn("getSignedUrl falló:", errSigned && errSigned.message ? errSigned.message : errSigned);
          signedUrl = null;
        }

        // Fallback: construir una URL pública sin encodeURIComponent en la ruta completa.
        // Usamos la forma https://storage.googleapis.com/<bucket>/<object-name>
        const publicUrlFallback = `https://storage.googleapis.com/${GCS_BUCKET}/${destName}`;

        const urlToStore = signedUrl || publicUrlFallback;

        // Guardar referencia en DB (si no hay signedUrl guardamos la URL pública)
        await pool.query(
          `UPDATE Dynamic_hv_aspirante SET foto_gcs_path = ?, foto_public_url = ? WHERE identificacion = ?`,
          [destName, signedUrl || publicUrlFallback, identificacion]
        );

        return res.json({
          ok: true,
          foto_gcs_path: destName,
          foto_public_url: urlToStore,
          message: signedUrl ? "Signed URL generada" : "Archivo subido; fallback a URL pública"
        });
      } catch (err) {
        console.error("Error post-upload:", err);
        return res.status(500).json({ ok: false, error: "Error guardando referencia en DB" });
      }
    });

    // Iniciar escritura
    stream.end(file.buffer);
  } catch (err) {
    console.error("Error upload-photo:", err);
    return res.status(500).json({ ok: false, error: "Error en endpoint upload-photo" });
  }
});

// ======================================================
//  REGISTRO COMPLETO DE HOJA DE VIDA
//  POST /api/hv/registrar
// ======================================================
app.post("/api/hv/registrar", async (req, res) => {
  const body = req.body;

  // Desestructuramos lo que envía el front
  const datosAspirante = body || {};

  const {
    // Datos personales (Dynamic_hv_aspirante)
    tipo_documento,
    identificacion,
    primer_nombre,
    segundo_nombre,
    primer_apellido,
    segundo_apellido,
    fecha_nacimiento,
    edad,
    departamento_expedicion,
    ciudad_expedicion,
    fecha_expedicion,
    estado_civil,
    direccion_barrio,
    departamento_residencia,
    ciudad_residencia,
    telefono,
    correo_electronico,
    eps,
    afp,
    rh,
    talla_pantalon,
    camisa_talla,
    zapatos_talla,
    origen_registro,
    medio_reclutamiento,
    recomendador_aspirante,

    // Bloques relacionados
    educacion = [],
    experiencia_laboral = [],
    familiares = [],
    referencias = [],
    contacto_emergencia = {},
    metas_personales = {},
    seguridad = {}
  } = datosAspirante;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Verificar si ya existe aspirante con esta identificación
    let idAspirante = null;
    if (identificacion) {
      const [existingRows] = await conn.query(
        `SELECT id_aspirante FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
        [identificacion]
      );
      if (existingRows && existingRows.length > 0) {
        idAspirante = existingRows[0].id_aspirante;
      }
    }

    if (idAspirante) {
      // --- Caso: ya existe -> hacemos UPDATE y reinsertamos hijos ---
      await conn.query(
        `
        UPDATE Dynamic_hv_aspirante SET
          tipo_documento = ?,
          primer_nombre = ?,
          segundo_nombre = ?,
          primer_apellido = ?,
          segundo_apellido = ?,
          fecha_nacimiento = ?,
          edad = ?,
          departamento_expedicion = ?,
          ciudad_expedicion = ?,
          fecha_expedicion = ?,
          estado_civil = ?,
          direccion_barrio = ?,
          departamento = ?,       -- se usa la columna 'departamento' para departamento_residencia
          ciudad = ?,            -- se usa la columna 'ciudad' para ciudad_residencia
          telefono = ?,
          correo_electronico = ?,
          eps = ?,
          afp = ?,
          rh = ?,
          talla_pantalon = ?,
          camisa_talla = ?,
          zapatos_talla = ?,
          foto_gcs_path = ?,
          foto_public_url = ?,
          origen_registro = ?,
          medio_reclutamiento = ?,
          recomendador_aspirante = ?,
          fecha_registro = NOW()
        WHERE id_aspirante = ?
        `,
        [
          tipo_documento || null,
          primer_nombre || null,
          segundo_nombre || null,
          primer_apellido || null,
          segundo_apellido || null,
          fecha_nacimiento || null,
          edad || null,
          departamento_expedicion || null,
          ciudad_expedicion || null,
          fecha_expedicion || null,
          estado_civil || null,
          direccion_barrio || null,
          departamento_residencia || null,
          ciudad_residencia || null,
          telefono || null,
          correo_electronico || null,
          eps || null,
          afp || null,
          rh || null,
          talla_pantalon || null,
          camisa_talla || null,
          zapatos_talla || null,
          datosAspirante.foto_gcs_path || null,
          datosAspirante.foto_public_url || null,
          origen_registro || "WEB",
          medio_reclutamiento || null,
          recomendador_aspirante || null,
          idAspirante
        ]
      );

      // Borrar datos hijos existentes para ese aspirante (los volveremos a insertar)
      await conn.query(`DELETE FROM Dynamic_hv_educacion WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_familiares WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_referencias WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_contacto_emergencia WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_metas_personales WHERE id_aspirante = ?`, [idAspirante]);
      await conn.query(`DELETE FROM Dynamic_hv_seguridad WHERE id_aspirante = ?`, [idAspirante]);

    } else {
      // --- Caso: no existe -> insertar nuevo aspirante ---
      const [aspiranteResult] = await conn.query(
        `
        INSERT INTO Dynamic_hv_aspirante (
          tipo_documento,
          identificacion,
          primer_nombre,
          segundo_nombre,
          primer_apellido,
          segundo_apellido,
          fecha_nacimiento,
          edad,
          departamento_expedicion,
          ciudad_expedicion,
          fecha_expedicion,
          estado_civil,
          direccion_barrio,
          departamento,
          ciudad,
          telefono,
          correo_electronico,
          eps,
          afp,
          rh,
          talla_pantalon,
          camisa_talla,
          zapatos_talla,
          foto_gcs_path,
          foto_public_url,
          origen_registro,
          medio_reclutamiento,
          recomendador_aspirante,
          fecha_registro
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())
        `,
        [
          tipo_documento || null,
          identificacion || null,
          primer_nombre || null,
          segundo_nombre || null,
          primer_apellido || null,
          segundo_apellido || null,
          fecha_nacimiento || null,
          edad || null,
          departamento_expedicion || null,
          ciudad_expedicion || null,
          fecha_expedicion || null,
          estado_civil || null,
          direccion_barrio || null,
          departamento_residencia || null,
          ciudad_residencia || null,
          telefono || null,
          correo_electronico || null,
          eps || null,
          afp || null,
          rh || null,
          talla_pantalon || null,
          camisa_talla || null,
          zapatos_talla || null,
          datosAspirante.foto_gcs_path || null,
          datosAspirante.foto_public_url || null,
          origen_registro || "WEB",
          medio_reclutamiento || null,
          recomendador_aspirante || null
        ]
      );

      // Obtener id mediante la identificación (garantiza compatibilidad con estructura actual)
      const [rowId] = await conn.query(
        `SELECT id_aspirante FROM Dynamic_hv_aspirante WHERE identificacion = ? ORDER BY fecha_registro DESC LIMIT 1`,
        [identificacion]
      );
      idAspirante = rowId && rowId[0] ? rowId[0].id_aspirante : null;
    }

    if (!idAspirante) {
      throw new Error("No se pudo obtener id_aspirante después de insert/update");
    }

    // 2) Educación (Dynamic_hv_educacion)
    for (const edu of educacion) {
      if (!edu.institucion && !edu.programa) continue;

      await conn.query(
        `
        INSERT INTO Dynamic_hv_educacion (
          id_aspirante,
          institucion,
          programa,
          nivel_escolaridad,
          modalidad,
          ano,
          finalizado
        )
        VALUES (?,?,?,?,?,?,?)
        `,
        [
          idAspirante,
          edu.institucion || null,
          edu.programa || null,
          edu.nivel_escolaridad || null,
          edu.modalidad || null,
          edu.ano || null,
          edu.finalizado || null
        ]
      );
    }

    // 3) Experiencia laboral (Dynamic_hv_experiencia_laboral)
    for (const exp of experiencia_laboral) {
      if (!exp.empresa && !exp.cargo) continue;

      await conn.query(
        `
        INSERT INTO Dynamic_hv_experiencia_laboral (
          id_aspirante,
          empresa,
          cargo,
          tiempo_laborado,
          salario,
          motivo_retiro,
          funciones
        )
        VALUES (?,?,?,?,?,?,?)
        `,
        [
          idAspirante,
          exp.empresa || null,
          exp.cargo || null,
          exp.tiempo_laborado || null,
          exp.salario || null,
          exp.motivo_retiro || null,
          exp.funciones || null
        ]
      );
    }

    // 4) Familiares (Dynamic_hv_familiares)
    for (const fam of familiares) {
      if (!fam.nombre_completo) continue;

      await conn.query(
        `
        INSERT INTO Dynamic_hv_familiares (
          id_aspirante,
          nombre_completo,
          parentesco,
          edad,
          ocupacion,
          conviven_juntos
        )
        VALUES (?,?,?,?,?,?)
        `,
        [
          idAspirante,
          fam.nombre_completo || null,
          fam.parentesco || null,
          fam.edad || null,
          fam.ocupacion || null,
          fam.conviven_juntos || null
        ]
      );
    }

    // 5) Referencias (Dynamic_hv_referencias)
    for (const ref of referencias) {
      if (!ref.tipo_referencia) continue;

      await conn.query(
        `
        INSERT INTO Dynamic_hv_referencias (
        id_aspirante,
        tipo_referencia,
        empresa,
        jefe_inmediato,
        cargo_jefe,
        nombre_completo,
        telefono,
        ocupacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          idAspirante,
          ref.tipo_referencia,
          ref.empresa || null,
          ref.jefe_inmediato || null,
          ref.cargo_jefe || null,
          ref.nombre_completo || null,
          ref.telefono || null,
          ref.ocupacion || null
        ]
      );
    }

    // 6) Contacto de emergencia (Dynamic_hv_contacto_emergencia)
    if (contacto_emergencia && contacto_emergencia.nombre_completo) {
      await conn.query(
        `
        INSERT INTO Dynamic_hv_contacto_emergencia (
          id_aspirante,
          nombre_completo,
          parentesco,
          telefono,
          correo_electronico,
          direccion
        )
        VALUES (?,?,?,?,?,?)
        `,
        [
          idAspirante,
          contacto_emergencia.nombre_completo || null,
          contacto_emergencia.parentesco || null,
          contacto_emergencia.telefono || null,
          contacto_emergencia.correo_electronico || null,
          contacto_emergencia.direccion || null
        ]
      );
    }

    // 7) Metas personales (Dynamic_hv_metas_personales)
    if (metas_personales) {
      await conn.query(
        `
        INSERT INTO Dynamic_hv_metas_personales (
          id_aspirante,
          meta_corto_plazo,
          meta_mediano_plazo,
          meta_largo_plazo
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          idAspirante,
          metas_personales.corto_plazo || null,
          metas_personales.mediano_plazo || null,
          metas_personales.largo_plazo || null
        ]
      );
    }

    // 8) Seguridad / cuestionario personal (Dynamic_hv_seguridad)
    if (seguridad) {
      await conn.query(
        `
        INSERT INTO Dynamic_hv_seguridad (
          id_aspirante,
          llamados_atencion,
          detalle_llamados,
          accidente_laboral,
          detalle_accidente,
          enfermedad_importante,
          detalle_enfermedad,
          consume_alcohol,
          frecuencia_alcohol,
          familiar_en_empresa,
          detalle_familiar_empresa,
          info_falsa,
          acepta_poligrafo,
          observaciones,
          califica_para_cargo,
          fortalezas,
          aspectos_mejorar,
          resolucion_problemas
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          idAspirante,
          seguridad.llamados_atencion || null,
          seguridad.detalle_llamados || null,
          seguridad.accidente_laboral || null,
          seguridad.detalle_accidente || null,
          seguridad.enfermedad_importante || null,
          seguridad.detalle_enfermedad || null,
          seguridad.consume_alcohol || null,
          seguridad.frecuencia_alcohol || null,
          seguridad.familiar_en_empresa || null,
          seguridad.detalle_familiar_empresa || null,
          seguridad.info_falsa || null,
          seguridad.acepta_poligrafo || null,
          seguridad.observaciones || null,
          seguridad.califica_para_cargo || null,
          seguridad.fortalezas || null,
          seguridad.aspectos_mejorar || null,
          seguridad.resolucion_problemas || null
        ]
      );
    }

    await conn.commit();

    try {
      // preparar dataObjects a partir de lo que acabas de insertar/actualizar
      // --- Construir HTML para listas (insertar en server.js justo antes de llamar generateAndUploadPdf) ---
      function toHtmlList(items, renderer) {
        if (!Array.isArray(items) || items.length === 0) return "<div class='small'>No registrado</div>";
        return items.map((it, i) => `<div class="list-item"><strong>${i + 1}.</strong> ${renderer(it)}</div>`).join("");
      }

      const EDUCACION_LIST = toHtmlList(
        educacion,
        e => `${escapeHtml(e.institucion || "")} — ${escapeHtml(e.programa || "")} (${escapeHtml(e.modalidad || "-")}) ${e.ano ? `• ${escapeHtml(String(e.ano))}` : ""}`
      );

      const EXPERIENCIA_LIST = toHtmlList(
        experiencia_laboral,
        ex => `${escapeHtml(ex.empresa || "")} — ${escapeHtml(ex.cargo || "")}<br><span class="small">${escapeHtml(ex.tiempo_laborado || "")} • ${escapeHtml(ex.funciones || "")}</span>`
      );

      const REFERENCIAS_LIST = toHtmlList(
        referencias,
        r => {
          if ((r.tipo_referencia || "").toLowerCase().includes("laboral")) {
            return `${escapeHtml(r.empresa || "")} — ${escapeHtml(r.jefe_inmediato || "")} (${escapeHtml(r.telefono || "")})`;
          }
          return `${escapeHtml(r.nombre_completo || "")} — ${escapeHtml(r.telefono || "")} ${escapeHtml(r.ocupacion || "") ? "• " + escapeHtml(r.ocupacion) : ""}`;
        }
      );

      const FAMILIARES_LIST = toHtmlList(
        familiares,
        f => `${escapeHtml(f.nombre_completo || "")} — ${escapeHtml(f.parentesco || "")} • ${escapeHtml(String(f.edad || ""))}`
      );

      const CONTACTO_HTML = contacto_emergencia && contacto_emergencia.nombre_completo
        ? `${escapeHtml(contacto_emergencia.nombre_completo)} • ${escapeHtml(contacto_emergencia.telefono || "")} • ${escapeHtml(contacto_emergencia.correo_electronico || "")}`
        : "";

      // Construir METAS_HTML enumerada (mantiene compatibilidad con meta_* o corto_plazo)
      const metasObj = metas_personales || {};
      const metasItems = [];
      const m1 = metasObj.meta_corto_plazo || metasObj.corto_plazo || "";
      const m2 = metasObj.meta_mediano_plazo || metasObj.mediano_plazo || "";
      const m3 = metasObj.meta_largo_plazo || metasObj.largo_plazo || "";
      if (m1 && m1.trim()) metasItems.push(m1.trim());
      if (m2 && m2.trim()) metasItems.push(m2.trim());
      if (m3 && m3.trim()) metasItems.push(m3.trim());

      let METAS_HTML;
      if (metasItems.length === 0) {
        METAS_HTML = "<div class='small'>No registrado</div>";
      } else {
        METAS_HTML = metasItems.map((txt, i) =>
          `<div class="list-item"><strong>${i + 1}.</strong> ${escapeHtml(txt)}</div>`
        ).join("");
      }
      function siNo(valor) {
        if (valor === null || valor === undefined) return "";
        return valor == 1 ? "Sí" : "No";
      }

      // Construir dataObjects para la plantilla
      // --- Construir dataObjects para la plantilla (reemplazar el aspiranteData actual) ---
      const aspiranteData = {
        NOMBRE_COMPLETO: `${escapeHtml(primer_nombre || "")} ${escapeHtml(primer_apellido || "")}`.trim(),
        TIPO_ID: escapeHtml(tipo_documento || ""),
        IDENTIFICACION: escapeHtml(identificacion || ""),
        CIUDAD_RESIDENCIA: escapeHtml(ciudad_residencia || datosAspirante.ciudad || ""),
        TELEFONO: escapeHtml(telefono || datosAspirante.telefono || ""),
        CORREO: escapeHtml(correo_electronico || datosAspirante.correo_electronico || ""),
        DIRECCION: escapeHtml(direccion_barrio || datosAspirante.direccion_barrio || ""),
        FECHA_NACIMIENTO: escapeHtml(fecha_nacimiento || ""),
        ESTADO_CIVIL: escapeHtml(estado_civil || ""),
        EPS: escapeHtml(eps || ""),
        AFP: escapeHtml(afp || ""),

        RH: escapeHtml(rh || ""),
        CAMISA_TALLA: escapeHtml(camisa_talla || ""),
        TALLA_PANTALON: escapeHtml(talla_pantalon || ""),
        ZAPATOS_TALLA: escapeHtml(zapatos_talla || ""),

        PHOTO_URL: datosAspirante.foto_public_url || "",

        // HTML ya construido arriba
        EDUCACION_LIST,
        EXPERIENCIA_LIST,
        REFERENCIAS_LIST,
        FAMILIARES_LIST,
        CONTACTO_EMERGENCIA: CONTACTO_HTML,
        METAS: METAS_HTML,

        FECHA_GENERACION: new Date().toLocaleString(),

        // Logo: preferible usar variable de entorno LOGO_PUBLIC_URL en lugar de hardcodear
        LOGO_URL: process.env.LOGO_PUBLIC_URL || "https://storage.googleapis.com/logyser-recibo-public/logo.png",

        // Seguridad / cuestionario
        SEG_LLAMADOS: siNo(seguridad && seguridad.llamados_atencion),
        SEG_DETALLE_LLAMADOS: escapeHtml((seguridad && seguridad.detalle_llamados) || ""),
        SEG_ACCIDENTE: siNo(seguridad && seguridad.accidente_laboral),
        SEG_DETALLE_ACCIDENTE: escapeHtml((seguridad && seguridad.detalle_accidente) || ""),
        SEG_ENFERMEDAD: siNo(seguridad && seguridad.enfermedad_importante),
        SEG_DETALLE_ENFERMEDAD: escapeHtml((seguridad && seguridad.detalle_enfermedad) || ""),
        SEG_ALCOHOL: siNo(seguridad && seguridad.consume_alcohol),
        SEG_FRECUENCIA: escapeHtml((seguridad && seguridad.frecuencia_alcohol) || ""),
        SEG_FAMILIAR: siNo(seguridad && seguridad.familiar_en_empresa),
        SEG_DETALLE_FAMILIAR: escapeHtml((seguridad && seguridad.detalle_familiar_empresa) || ""),
        SEG_INFO_FALSA: siNo(seguridad && seguridad.info_falsa),
        SEG_POLIGRAFO: siNo(seguridad && seguridad.acepta_poligrafo),
        SEG_FORTALEZAS: escapeHtml((seguridad && seguridad.fortalezas) || ""),
        SEG_MEJORAR: escapeHtml((seguridad && seguridad.aspectos_mejorar) || ""),
        SEG_RESOLUCION: escapeHtml((seguridad && seguridad.resolucion_problemas) || ""),
        SEG_OBSERVACIONES: escapeHtml((seguridad && seguridad.observaciones) || "")
      };

      const { destName, signedUrl } = await generateAndUploadPdf({ identificacion, dataObjects: aspiranteData });

      // Actualizar DB con referencia al PDF
      await conn.query(
        `UPDATE Dynamic_hv_aspirante SET pdf_gcs_path = ?, pdf_public_url = ? WHERE identificacion = ?`,
        [destName, signedUrl, identificacion]
      );
    } catch (err) {
      console.error("Error generando PDF:", err);
      // no fallo crítico: puedes continuar; opcional: notificar
    }

    res.json({
      ok: true,
      message: "Hoja de vida registrada correctamente",
      id_aspirante: idAspirante
    });
  } catch (error) {
    console.error("Error registrando HV:", error);
    await conn.rollback();
    res.status(500).json({
      ok: false,
      error: "Error registrando hoja de vida"
    });
  } finally {
    conn.release();
  }

});

app.use("/api/correo", correoAspiranteRoutes);

app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  // Si es una ruta de API, continúa
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => {
  console.log(`HV server listening on port ${PORT}`);
});

async function shutdown() {
  console.log("Shutting down server...");
  try {
    await pool.end();
    console.log("DB pool closed.");
  } catch (err) {
    console.error("Error closing DB pool:", err);
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);