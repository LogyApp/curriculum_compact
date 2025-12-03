// ==========================================================
//  Backend de configuración HV - Logyser
//  Node.js + Express + MySQL (mysql2/promise)
//  Listo para Cloud Run
// ==========================================================
import path from 'path';
import { generateAndUploadPdf } from "./pdf-generator.js";
import fs from 'fs'; // <-- AÑADE ESTO

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
  limits: { fileSize: 5 * 1024 * 1024 } // límite 5MB
});

// Determinar si estamos en Cloud Run o local
const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;

// Configuración de Storage
let storageGcs;
let GCS_BUCKET;
let bucket = null;

try {
  if (isCloudRun) {
    // En Cloud Run - usar credenciales automáticas
    console.log("Usando credenciales automáticas de Cloud Run");
    storageGcs = new Storage();
    GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
  } else {
    // En local - usar archivo de credenciales
    console.log("Modo desarrollo local");

    // PRIMERO intentar con variable de entorno
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("Usando credenciales de variable de entorno");
      storageGcs = new Storage();
    }
    // SEGUNDO intentar con archivo json-key.json
    else {
      const keyFilename = path.join(__dirname, 'json-key.json');
      if (fs.existsSync(keyFilename)) {
        console.log(`Usando credenciales desde archivo: ${keyFilename}`);
        storageGcs = new Storage({
          keyFilename: keyFilename
        });
      } else {
        console.warn("⚠️  Archivo json-key.json no encontrado y GOOGLE_APPLICATION_CREDENTIALS no definida");
        console.warn("⚠️  Las funciones de subida de archivos no estarán disponibles en desarrollo local");
        console.warn("⚠️  Para desarrollo, crea json-key.json o define la variable de entorno");
      }
    }

    GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
  }

  // Solo crear bucket si tenemos storage configurado
  if (storageGcs) {
    bucket = storageGcs.bucket(GCS_BUCKET);
    console.log(`✅ Bucket configurado: ${GCS_BUCKET}`);

    // Verificar que el bucket existe
    try {
      const [exists] = await bucket.exists();
      if (exists) {
        console.log(`✅ Bucket ${GCS_BUCKET} accesible`);
      } else {
        console.error(`❌ Bucket ${GCS_BUCKET} no existe o no es accesible`);
        console.error(`   Verifica que el bucket exista y el service account tenga permisos`);
        bucket = null; // No podemos usar un bucket que no existe
      }
    } catch (bucketError) {
      console.error(`❌ Error verificando bucket ${GCS_BUCKET}:`, bucketError.message);
      bucket = null;
    }
  } else {
    console.warn("⚠️  Storage GCS no configurado - funcionalidades de archivo deshabilitadas");
  }

} catch (configError) {
  console.error("❌ Error configurando Google Cloud Storage:", configError.message);
  bucket = null;
}

console.log(`🌍 Entorno: ${isCloudRun ? 'Cloud Run' : 'Local'}`);
console.log(`📦 Bucket disponible: ${bucket ? 'Sí' : 'No'}`);

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
  console.log("📝 HV Registrar endpoint hit");

  // ========== HEADERS CORS EXPLÍCITOS ==========
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  const body = req.body;
  const datosAspirante = body || {};

  // Validación mínima requerida
  if (!datosAspirante.identificacion || !datosAspirante.tipo_documento) {
    return res.status(400).json({
      ok: false,
      error: "Identificación y tipo de documento son requeridos",
      details: "Faltan campos obligatorios"
    });
  }

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
    origen_registro = "WEB",
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
  let transactionCommitted = false;

  try {
    await conn.beginTransaction();

    // ========== 1. VERIFICAR Y OBTENER ID_ASPIRANTE ==========
    let idAspirante = null;
    let pdfExistente = null;

    const [existingRows] = await conn.query(
      `SELECT id_aspirante, pdf_gcs_path, pdf_public_url FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
      [identificacion]
    );

    if (existingRows && existingRows.length > 0) {
      idAspirante = existingRows[0].id_aspirante;
      pdfExistente = {
        gcs_path: existingRows[0].pdf_gcs_path,
        public_url: existingRows[0].pdf_public_url
      };
      console.log(`📄 Aspirante existente encontrado. ID: ${idAspirante}`);
    }

    // ========== 2. LIMPIAR PDFs ANTIGUOS DE GCS (OPCIONAL Y SEGURO) ==========
    if (identificacion && bucket && pdfExistente?.gcs_path) {
      try {
        console.log(`🧹 Intentando eliminar PDF anterior: ${pdfExistente.gcs_path}`);

        const oldFile = bucket.file(pdfExistente.gcs_path);
        const [exists] = await oldFile.exists();

        if (exists) {
          await oldFile.delete();
          console.log(`✅ PDF anterior eliminado de GCS`);
        } else {
          console.log(`ℹ️ PDF anterior no encontrado en GCS, continuando...`);
        }
      } catch (deleteError) {
        console.warn(`⚠️ No se pudo eliminar PDF anterior: ${deleteError.message}`);
        // CONTINUAR - esto no es crítico
      }
    }

    // ========== 3. INSERTAR/ACTUALIZAR ASPIRANTE ==========
    const ahora = new Date();

    if (idAspirante) {
      // UPDATE del aspirante existente
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
          departamento = ?,
          ciudad = ?,
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
          fecha_actualizacion = ?
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
          origen_registro,
          medio_reclutamiento || null,
          recomendador_aspirante || null,
          ahora,
          idAspirante
        ]
      );

      // Limpiar datos relacionados
      const deleteQueries = [
        conn.query(`DELETE FROM Dynamic_hv_educacion WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_familiares WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_referencias WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_contacto_emergencia WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_metas_personales WHERE id_aspirante = ?`, [idAspirante]),
        conn.query(`DELETE FROM Dynamic_hv_seguridad WHERE id_aspirante = ?`, [idAspirante])
      ];

      await Promise.all(deleteQueries);
      console.log(`✅ Aspirante actualizado: ${identificacion}`);

    } else {
      // INSERT de nuevo aspirante
      const [aspiranteResult] = await conn.query(
        `
        INSERT INTO Dynamic_hv_aspirante (
          tipo_documento, identificacion, primer_nombre, segundo_nombre,
          primer_apellido, segundo_apellido, fecha_nacimiento, edad,
          departamento_expedicion, ciudad_expedicion, fecha_expedicion,
          estado_civil, direccion_barrio, departamento, ciudad,
          telefono, correo_electronico, eps, afp, rh,
          talla_pantalon, camisa_talla, zapatos_talla,
          foto_gcs_path, foto_public_url, origen_registro,
          medio_reclutamiento, recomendador_aspirante, fecha_registro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          origen_registro,
          medio_reclutamiento || null,
          recomendador_aspirante || null,
          ahora
        ]
      );

      // Obtener el ID del nuevo aspirante
      const [rowId] = await conn.query(
        `SELECT id_aspirante FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
        [identificacion]
      );
      idAspirante = rowId?.[0]?.id_aspirante;

      if (!idAspirante) {
        throw new Error("No se pudo obtener el ID del aspirante después de insertar");
      }
      console.log(`✅ Nuevo aspirante insertado. ID: ${idAspirante}`);
    }

    // ========== 4. INSERTAR DATOS RELACIONADOS ==========

    // 4.1 Educación
    for (const edu of educacion) {
      if (edu.institucion || edu.programa) {
        await conn.query(
          `INSERT INTO Dynamic_hv_educacion (id_aspirante, institucion, programa, nivel_escolaridad, modalidad, ano, finalizado)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    }

    // 4.2 Experiencia laboral
    for (const exp of experiencia_laboral) {
      if (exp.empresa || exp.cargo) {
        await conn.query(
          `INSERT INTO Dynamic_hv_experiencia_laboral (id_aspirante, empresa, cargo, tiempo_laborado, salario, motivo_retiro, funciones)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    }

    // 4.3 Familiares
    for (const fam of familiares) {
      if (fam.nombre_completo) {
        await conn.query(
          `INSERT INTO Dynamic_hv_familiares (id_aspirante, nombre_completo, parentesco, edad, ocupacion, conviven_juntos)
           VALUES (?, ?, ?, ?, ?, ?)`,
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
    }

    // 4.4 Referencias
    for (const ref of referencias) {
      if (ref.tipo_referencia) {
        await conn.query(
          `INSERT INTO Dynamic_hv_referencias (id_aspirante, tipo_referencia, empresa, jefe_inmediato, cargo_jefe, nombre_completo, telefono, ocupacion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
    }

    // 4.5 Contacto de emergencia
    if (contacto_emergencia?.nombre_completo) {
      await conn.query(
        `INSERT INTO Dynamic_hv_contacto_emergencia (id_aspirante, nombre_completo, parentesco, telefono, correo_electronico, direccion)
         VALUES (?, ?, ?, ?, ?, ?)`,
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

    // 4.6 Metas personales
    if (metas_personales) {
      await conn.query(
        `INSERT INTO Dynamic_hv_metas_personales (id_aspirante, meta_corto_plazo, meta_mediano_plazo, meta_largo_plazo)
         VALUES (?, ?, ?, ?)`,
        [
          idAspirante,
          metas_personales.corto_plazo || null,
          metas_personales.mediano_plazo || null,
          metas_personales.largo_plazo || null
        ]
      );
    }

    // 4.7 Seguridad
    if (seguridad) {
      await conn.query(
        `INSERT INTO Dynamic_hv_seguridad (
          id_aspirante, llamados_atencion, detalle_llamados, accidente_laboral, detalle_accidente,
          enfermedad_importante, detalle_enfermedad, consume_alcohol, frecuencia_alcohol,
          familiar_en_empresa, detalle_familiar_empresa, info_falsa, acepta_poligrafo,
          observaciones, califica_para_cargo, fortalezas, aspectos_mejorar, resolucion_problemas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // ========== 5. CONFIRMAR TRANSACCIÓN DE BASE DE DATOS ==========
    await conn.commit();
    transactionCommitted = true;
    console.log(`✅ Transacción de BD completada para: ${identificacion}`);

    // ========== 6. INTENTAR GENERAR PDF (FUERA DE LA TRANSACCIÓN) ==========
    let pdfResult = null;
    let pdfError = null;
    let pdfUrl = null;

    if (bucket && identificacion) {
      try {
        console.log(`📄 Preparando para generar PDF para: ${identificacion}`);

        // Preparar datos para el PDF (simplificado para evitar errores)
        const datosPDF = {
          NOMBRE_COMPLETO: `${primer_nombre || ''} ${primer_apellido || ''}`.trim(),
          IDENTIFICACION: identificacion || '',
          TELEFONO: telefono || '',
          CORREO: correo_electronico || '',
          DIRECCION: direccion_barrio || '',
          FECHA_GENERACION: new Date().toLocaleString('es-CO'),
          LOGO_URL: process.env.LOGO_PUBLIC_URL || "https://storage.googleapis.com/logyser-recibo-public/logo.png"
        };

        // Intentar generar PDF con timeout
        const pdfPromise = generateAndUploadPdf({
          identificacion,
          dataObjects: datosPDF,
          bucket,
          bucketName: GCS_BUCKET,
          deleteOldFiles: false // Ya manejamos esto antes
        });

        // Timeout de 45 segundos
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_GENERANDO_PDF')), 45000)
        );

        pdfResult = await Promise.race([pdfPromise, timeoutPromise]);
        pdfUrl = pdfResult?.publicUrl;

        if (pdfUrl) {
          console.log(`✅ PDF generado exitosamente: ${pdfUrl}`);

          // Actualizar BD con la nueva URL del PDF
          await conn.query(
            `UPDATE Dynamic_hv_aspirante SET 
              pdf_gcs_path = ?,
              pdf_public_url = ?,
              pdf_error = NULL
            WHERE identificacion = ?`,
            [pdfResult.destName, pdfUrl, identificacion]
          );
        }

      } catch (pdfGenError) {
        console.error(`❌ Error generando PDF: ${pdfGenError.message}`);
        pdfError = pdfGenError.message;

        // Registrar error en BD pero no fallar
        try {
          await conn.query(
            `UPDATE Dynamic_hv_aspirante SET 
              pdf_error = ?
            WHERE identificacion = ?`,
            [pdfError, identificacion]
          );
        } catch (dbError) {
          console.warn(`⚠️ No se pudo registrar error de PDF en BD: ${dbError.message}`);
        }
      }
    } else {
      pdfError = bucket ? 'IDENTIFICACION_NO_DISPONIBLE' : 'BUCKET_NO_CONFIGURADO';
      console.warn(`⚠️ No se generará PDF: ${pdfError}`);
    }

    // ========== 7. ENVIAR CORREO (ASINCRÓNICO, NO BLOQUEA) ==========
    if (pdfUrl && correo_electronico) {
      // Enviar en segundo plano
      setTimeout(async () => {
        try {
          const sendEmailModule = await import('./send-to-email.js');
          await sendEmailModule.default({
            nombre: `${primer_nombre} ${primer_apellido}`.trim(),
            identificacion,
            correo: correo_electronico,
            telefono,
            pdf_url: pdfUrl,
            timestamp: new Date().toLocaleString('es-CO')
          });
          console.log(`📧 Correo enviado exitosamente a ${correo_electronico}`);
        } catch (emailError) {
          console.error(`⚠️ Error enviando correo: ${emailError.message}`);
        }
      }, 1000);
    }

    // ========== 8. CONSTRUIR RESPUESTA AL CLIENTE ==========
    const respuesta = {
      ok: true,
      message: "Hoja de vida registrada exitosamente",
      id_aspirante: idAspirante,
      identificacion: identificacion,
      timestamp: ahora.toISOString(),
      datos_guardados: true
    };

    // Agregar información del PDF
    if (pdfUrl) {
      respuesta.pdf = {
        generado: true,
        url: pdfUrl,
        ruta: pdfResult?.destName
      };
    } else if (pdfError) {
      respuesta.pdf = {
        generado: false,
        error: pdfError.includes('TIMEOUT') ? 'timeout' : 'error_generacion',
        mensaje: pdfError
      };
      respuesta.message = "Hoja de vida registrada, pero el PDF no pudo ser generado";
    } else {
      respuesta.pdf = {
        generado: false,
        error: 'no_configurado',
        mensaje: 'Servicio de PDF no disponible'
      };
    }

    console.log(`📤 Enviando respuesta exitosa para ${identificacion}`);
    return res.json(respuesta);

  } catch (error) {
    console.error("❌ Error en /api/hv/registrar:", error);

    // Revertir transacción si no fue commitida
    if (!transactionCommitted) {
      try {
        await conn.rollback();
        console.log("↩️ Transacción revertida");
      } catch (rollbackError) {
        console.error("❌ Error en rollback:", rollbackError);
      }
    }

    // Construir respuesta de error EN JSON
    const errorResponse = {
      ok: false,
      error: "Error procesando la solicitud",
      message: error.message,
      identificacion: identificacion || null,
      timestamp: new Date().toISOString()
    };

    // Clasificar errores comunes
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      errorResponse.tipo_error = 'timeout';
      errorResponse.sugerencia = 'Intente nuevamente en unos momentos';
    } else if (error.message.includes('duplicate') || error.message.includes('DUPLICATE')) {
      errorResponse.tipo_error = 'duplicado';
      errorResponse.sugerencia = 'El registro ya existe';
    } else if (error.message.includes('connection') || error.message.includes('CONNECTION')) {
      errorResponse.tipo_error = 'conexion';
      errorResponse.sugerencia = 'Verifique su conexión a internet';
    }

    console.log(`📤 Enviando respuesta de error para ${identificacion}`);
    return res.status(500).json(errorResponse);

  } finally {
    // Liberar conexión siempre
    try {
      if (conn) {
        await conn.release();
        console.log(`🔓 Conexión liberada para: ${identificacion}`);
      }
    } catch (releaseError) {
      console.error("❌ Error liberando conexión:", releaseError);
    }
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

const PORT = process.env.PORT || 8080;

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

export { bucket, GCS_BUCKET };