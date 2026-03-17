import fs from 'fs';
import path from 'path';
import { generateAndUploadPdf } from "./pdf-generator.js";

import multer from "multer";
import { Storage } from "@google-cloud/storage";

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

import { fileURLToPath } from "url";

const app = express();
app.use(cors({
  origin: '*', // Permite peticiones desde cualquier origen (incluyendo tu localhost)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
dotenv.config();

import correoAspiranteRoutes from "./router/correoAspirante.js";

// === Servir frontend ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ==========================================
//  CONEXIÓN A MYSQL
// ==========================================

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DATABASE,
  port: parseInt(process.env.DBPORT),
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
// ✅ Helper: escape HTML para textos que iremos inyectando en la plantilla
function escapeHtml(str = "") {
  return String(str ?? "")
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
let bucketFirmas = null; // Declarada globalmente

try {
  if (isCloudRun) {
    console.log("Usando credenciales automáticas de Cloud Run");
    storageGcs = new Storage();
  } else {
    console.log("Modo desarrollo local");
    const keyFilename = path.join(__dirname, 'json-key.json');
    if (fs.existsSync(keyFilename)) {
      console.log(`Usando credenciales desde archivo: ${keyFilename}`);
      storageGcs = new Storage({ keyFilename: keyFilename });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("Usando credenciales de variable de entorno");
      storageGcs = new Storage();
    } else {
      console.warn("⚠️ No se encontraron credenciales de Google Cloud");
    }
  }

  GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";

  if (storageGcs) {
    // 1. Inicializamos los objetos de bucket SIEMPRE
    bucket = storageGcs.bucket(GCS_BUCKET);
    bucketFirmas = storageGcs.bucket('firmas-images'); 
    
    console.log(`✅ Objetos de bucket creados: ${GCS_BUCKET} y firmas-images`);

   // ✅ NO uses await aquí (top-level). Solo loguea y sigue.
    console.log(`ℹ️ Usando bucket configurado: ${GCS_BUCKET}. Se intentará operar sin verificación previa.`);
  }

} catch (configError) {
  console.error("❌ Error configurando Google Cloud Storage:", configError.message);
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

// ==========================================
//  ENDPOINT: Estado Civil
// ==========================================
app.get("/api/config/estado-civil", async (req, res) => {
  try {
    const rows = await query(`
      SELECT \`Condición\` AS estado_civil
      FROM Config_Estado_Civil
      ORDER BY \`Condición\`
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error estado civil:", error);
    res.status(500).json({ error: "Error cargando estado civil" });
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
      `SELECT empresa, cargo, ano_experiencia, tiempo_laborado, salario, motivo_retiro, funciones FROM Dynamic_hv_experiencia_laboral WHERE id_aspirante = ? ORDER BY fecha_registro`,
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
    if (!bucket) {
      return res.status(500).json({ ok: false, error: "Storage no disponible (bucket no configurado)" });
    }
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

// ========== FUNCIÓN PARA VERIFICAR SI ES NUEVO (AISLADA) ==========
async function verificarSiEsNuevo(identificacion) {
  if (!identificacion) return true;

  try {
    const connVerificacion = await pool.getConnection();

    const [result] = await connVerificacion.query(
      `SELECT COUNT(*) as count FROM Dynamic_hv_aspirante WHERE identificacion = ?`,
      [identificacion]
    );

    await connVerificacion.release();

    // FORZAR a booleano
    const count = Number(result[0].count) || 0;
    const esNuevo = count === 0;

    console.log(`🔍 Verificación aislada - ID: ${identificacion}, Count: ${count}, Es nuevo: ${esNuevo}`);

    return Boolean(esNuevo); // <-- Asegurar que sea booleano

  } catch (error) {
    console.error(`❌ Error en verificación aislada: ${error.message}`);
    return true;
  }
}

// Endpoint: eliminar foto de perfil (GCS + BD)
// DELETE /api/hv/foto/:identificacion
app.delete("/api/hv/foto/:identificacion", async (req, res) => {
  const identificacion = (req.params.identificacion || "").trim();
  if (!identificacion) {
    return res.status(400).json({ ok: false, error: "Falta identificación en la URL" });
  }

  try {
    // 1) Consultar ruta actual
    const [rows] = await pool.query(
      `SELECT foto_gcs_path FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
      [identificacion]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Aspirante no encontrado" });
    }

    const fotoPath = rows[0].foto_gcs_path;

    // 2) Intentar borrar de GCS (si hay path y bucket)
    let gcsDeleted = false;
    let gcsError = null;

    if (fotoPath && bucket) {
      try {
        const file = bucket.file(fotoPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          gcsDeleted = true;
        }
      } catch (err) {
        gcsError = err?.message || String(err);
        console.warn("⚠️ No se pudo borrar foto en GCS:", gcsError);
        // No abortamos: igual limpiamos BD para que no quede “amarrada”
      }
    }

    // 3) Limpiar BD
    await pool.query(
      `UPDATE Dynamic_hv_aspirante 
       SET foto_gcs_path = NULL, foto_public_url = NULL, fecha_actualizacion = NOW()
       WHERE identificacion = ?`,
      [identificacion]
    );

    return res.json({
      ok: true,
      message: "Foto eliminada (BD limpia).",
      gcsDeleted,
      gcsError
    });
  } catch (err) {
    console.error("❌ Error eliminando foto:", err);
    return res.status(500).json({
      ok: false,
      error: "Error eliminando foto",
      details: err?.message || String(err)
    });
  }
});

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
  if (!datosAspirante.identificacion) {
    return res.status(400).json({
      ok: false,
      error: "Identificación requerida",
      details: "El número de identificación es obligatorio"
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
    seguridad = {},
    firma_base64
  } = datosAspirante;

  const esNuevoVerificado = await verificarSiEsNuevo(identificacion);
  console.log(`✅ Estado verificado: ${esNuevoVerificado ? 'NUEVO REGISTRO' : 'ACTUALIZACIÓN'}`);
  let esNuevoRegistro = esNuevoVerificado;

  // DEBUG: Verificar estructura de datos recibidos
  console.log('📋 Datos recibidos para depuración:');
  console.log('- identificacion:', identificacion);
  console.log('- departamento_residencia:', departamento_residencia);
  console.log('- ciudad_residencia:', ciudad_residencia);
  console.log('- Tiene foto_gcs_path?', 'foto_gcs_path' in datosAspirante);
  console.log('- Tiene foto_public_url?', 'foto_public_url' in datosAspirante);

  const conn = await pool.getConnection();
  let transactionCommitted = false;

  try {
    await conn.beginTransaction();

    // ========== 1. VERIFICAR Y OBTENER ID_ASPIRANTE ==========
    let idAspirante = null;
    let pdf_gcs_path_anterior = null;
    let pdf_public_url_anterior = null;

    if (identificacion) {
      const [existingRows] = await pool.query(
        `SELECT id_aspirante, pdf_gcs_path, pdf_public_url FROM Dynamic_hv_aspirante WHERE identificacion = ? LIMIT 1`,
        [identificacion]
      );

      if (existingRows && existingRows.length > 0) {
        idAspirante = existingRows[0].id_aspirante;
        pdf_gcs_path_anterior = existingRows[0].pdf_gcs_path;
        pdf_public_url_anterior = existingRows[0].pdf_public_url;

        console.log(`📄 Aspirante existente encontrado. ID: ${idAspirante}`);
        if (pdf_gcs_path_anterior) {
          console.log(`📁 PDF anterior en BD: ${pdf_gcs_path_anterior}`);
        }
      } else {
        console.log(`🆕 Aspirante no encontrado, se creará nuevo registro`);
      }
    }

    // ========== 2. PASO CRÍTICO: LIMPIAR CAMPOS DE PDF EN LA BD (ANTES DE CUALQUIER COSA) ==========
    console.log(`🧹 PASO 2: Limpiando campos de PDF en la BD para ${identificacion}...`);

    if (idAspirante) {
      // Si ya existe, primero limpiamos los campos de PDF en la BD
      await conn.query(
        `UPDATE Dynamic_hv_aspirante SET 
          pdf_gcs_path = NULL,
          pdf_public_url = NULL
        WHERE identificacion = ?`,
        [identificacion]
      );
      console.log(`✅ Campos de PDF limpiados en BD para ${identificacion}`);
    }

    // ========== 3. LIMPIAR PDFs ANTIGUOS DE GCS (SI EXISTEN) ==========
    if (identificacion && bucket && pdf_gcs_path_anterior) {
      try {
        console.log(`🗑️ Intentando eliminar archivo físico de GCS: ${pdf_gcs_path_anterior}`);

        const oldFile = bucket.file(pdf_gcs_path_anterior);
        const [exists] = await oldFile.exists();

        if (exists) {
          await oldFile.delete();
          console.log(`✅ Archivo eliminado de GCS: ${pdf_gcs_path_anterior}`);
        } else {
          console.log(`ℹ️ Archivo no encontrado en GCS: ${pdf_gcs_path_anterior}`);
        }
      } catch (gcsDeleteError) {
        console.warn(`⚠️ No se pudo eliminar archivo de GCS: ${gcsDeleteError.message}`);
        // NO es crítico, continuamos
      }
    }

    // ========== 4. INSERTAR/ACTUALIZAR ASPIRANTE ==========
    const ahora = new Date();

    // Variables para foto (vienen en datosAspirante, no en la desestructuración)
    let foto_gcs_path = datosAspirante.foto_gcs_path || null;
    let foto_public_url = datosAspirante.foto_public_url || null;

    // ✅ Defensa: no guardar base64 en BD
    if (foto_public_url && String(foto_public_url).startsWith("data:image/")) {
      console.warn("⚠️ foto_public_url venía como base64 (data:image). Se ignorará para evitar ER_DATA_TOO_LONG.");
      foto_public_url = null;
      foto_gcs_path = foto_gcs_path && String(foto_gcs_path).startsWith("data:") ? null : foto_gcs_path;
    }

    if (idAspirante) {
      // --- Caso: ya existe -> hacemos UPDATE y reinsertamos hijos ---
      console.log(`🔄 Actualizando aspirante existente ID: ${idAspirante}`);

      const updateQuery = `
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
      `;

      const updateParams = [
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
        // Si no viene foto nueva, intentamos mantener la anterior (si la tenemos) o enviamos la que llegue
        foto_gcs_path || datosAspirante.foto_gcs_path || null,
        foto_public_url || datosAspirante.foto_public_url || null,
        origen_registro,
        medio_reclutamiento || null,
        recomendador_aspirante || null,
        ahora,
        idAspirante
      ];

      console.log('📝 Ejecutando UPDATE con parámetros:', updateParams.length);
      await conn.query(updateQuery, updateParams);

      // Borrar datos hijos existentes para ese aspirante
      console.log(`🗑️ Eliminando registros hijos para aspirante ${idAspirante}`);
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
      // --- Caso: no existe -> insertar nuevo aspirante ---
      console.log(`🆕 Insertando nuevo aspirante: ${identificacion}`);

      const insertQuery = `
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertParams = [
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
        foto_gcs_path,
        foto_public_url,
        origen_registro,
        medio_reclutamiento || null,
        recomendador_aspirante || null,
        ahora
      ];

      console.log('📝 Ejecutando INSERT con parámetros:', insertParams.length);
      const [aspiranteResult] = await conn.query(insertQuery, insertParams);

      // Obtener id mediante la identificación
      const [rowId] = await conn.query(
        `SELECT id_aspirante FROM Dynamic_hv_aspirante WHERE identificacion = ? ORDER BY fecha_registro DESC LIMIT 1`,
        [identificacion]
      );
      idAspirante = rowId && rowId[0] ? rowId[0].id_aspirante : null;

      console.log(`✅ Nuevo aspirante insertado. ID: ${idAspirante}`);
    }

    if (!idAspirante) {
      throw new Error("No se pudo obtener id_aspirante después de insert/update");
    }

    const hvId = idAspirante;

    // ========== 5. INSERTAR DATOS RELACIONADOS ==========

    // 5.1) Educación (Dynamic_hv_educacion)
    if (educacion && educacion.length > 0) {
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
      console.log(`✅ Educación: ${educacion.length} registros`);
    } else {
      console.log(`ℹ️ Educación: Sin registros`);
    }

    // 5.2) Experiencia laboral (Dynamic_hv_experiencia_laboral)
    if (experiencia_laboral && experiencia_laboral.length > 0) {
      for (const exp of experiencia_laboral) {
        if (!exp.empresa && !exp.cargo) continue;

        await conn.query(
          `
          INSERT INTO Dynamic_hv_experiencia_laboral (
            id_aspirante,
            empresa,
            cargo,
            ano_experiencia,
            tiempo_laborado,
            salario,
            motivo_retiro,
            funciones
          )
          VALUES (?,?,?,?,?,?,?,?)
          `,
          [
            idAspirante,
            exp.empresa || null,
            exp.cargo || null,
            exp.ano_experiencia || null,
            exp.tiempo_laborado || null,
            exp.salario || null,
            exp.motivo_retiro || null,
            exp.funciones || null
          ]
        );
      }
      console.log(`✅ Experiencia: ${experiencia_laboral.length} registros`);
    } else {
      console.log(`ℹ️ Experiencia: Sin registros`);
    }

    // 5.3) Familiares (Dynamic_hv_familiares)
    if (familiares && familiares.length > 0) {
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
      console.log(`✅ Familiares: ${familiares.length} registros`);
    } else {
      console.log(`ℹ️ Familiares: Sin registros`);
    }

    // 5.4) Referencias (Dynamic_hv_referencias)
    if (referencias && referencias.length > 0) {
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
      console.log(`✅ Referencias: ${referencias.length} registros`);
    } else {
      console.log(`ℹ️ Referencias: Sin registros`);
    }

    // 5.5) Contacto de emergencia (Dynamic_hv_contacto_emergencia)
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
      console.log(`✅ Contacto emergencia: registrado`);
    } else {
      console.log(`ℹ️ Contacto emergencia: Sin registro`);
    }

    // 5.6) Metas personales (Dynamic_hv_metas_personales)
    // Validamos que exista el objeto y que al menos una de las metas tenga contenido
    const hasMetas = metas_personales && (
      metas_personales.meta_corto_plazo || metas_personales.corto_plazo ||
      metas_personales.meta_mediano_plazo || metas_personales.mediano_plazo ||
      metas_personales.meta_largo_plazo || metas_personales.largo_plazo
    );

    if (hasMetas) {
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
          metas_personales.meta_corto_plazo || metas_personales.corto_plazo || null,
          metas_personales.meta_mediano_plazo || metas_personales.mediano_plazo || null,
          metas_personales.meta_largo_plazo || metas_personales.largo_plazo || null
        ]
      );
      console.log(`✅ Metas personales: registradas correctamente`);
    } else {
      console.log(`ℹ️ Metas personales: Sin registro detectado`);
    }

    // 5.7) Seguridad / cuestionario personal (Dynamic_hv_seguridad)
    if (seguridad && Object.keys(seguridad).length > 0) {
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
      console.log(`✅ Seguridad: registrada`);
    } else {
      console.log(`ℹ️ Seguridad: Sin registro`);
    }
   
    // ========== 6. CONSTRUIR DATOS PARA EL PDF ==========
    console.log(`📊 Preparando datos para PDF...`);

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
      ex => {
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
      }
    );

    const REFERENCIAS_LIST = toHtmlList(
      referencias,
      r => {
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
      }
    );

    const FAMILIARES_LIST = toHtmlList(
      familiares,
      f => `${escapeHtml(f.nombre_completo || "")} — ${escapeHtml(f.parentesco || "")} • ${escapeHtml(String(f.edad || ""))}`
    );

    const CONTACTO_HTML = contacto_emergencia && contacto_emergencia.nombre_completo
      ? `${escapeHtml(contacto_emergencia.nombre_completo)} • ${escapeHtml(contacto_emergencia.telefono || "")} • ${escapeHtml(contacto_emergencia.correo_electronico || "")}`
      : "";

    // Construir METAS_HTML enumerada
    const metasObj = metas_personales || {};
    const mCorto = (metasObj.meta_corto_plazo || metasObj.corto_plazo || "").trim();
    const mMediano = (metasObj.meta_mediano_plazo || metasObj.mediano_plazo || "").trim();
    const mLargo = (metasObj.meta_largo_plazo || metasObj.largo_plazo || "").trim();

    let METAS_HTML = "No registrado";
    const metasFilas = [];

    if (mCorto) metasFilas.push(`<div><strong>Corto plazo:</strong> ${escapeHtml(mCorto)}</div>`);
    if (mMediano) metasFilas.push(`<div><strong>Mediano plazo:</strong> ${escapeHtml(mMediano)}</div>`);
    if (mLargo) metasFilas.push(`<div><strong>Largo plazo:</strong> ${escapeHtml(mLargo)}</div>`);

    if (metasFilas.length > 0) {
      METAS_HTML = metasFilas.join("");
    }

    function siNo(valor) {
      if (valor === null || valor === undefined) return "";
      return valor == 1 || valor === true || valor === "true" ? "Sí" : "No";
    }

    // Construir dataObjects para la plantilla del PDF
    const aspiranteData = {
      NOMBRE_COMPLETO: `${escapeHtml(primer_nombre || "")} ${escapeHtml(primer_apellido || "")}`.trim(),
      TIPO_ID: escapeHtml(tipo_documento || ""),
      IDENTIFICACION: escapeHtml(identificacion || ""),
      CIUDAD_RESIDENCIA: escapeHtml(ciudad_residencia || ""),
      TELEFONO: escapeHtml(telefono || ""),
      CORREO: escapeHtml(correo_electronico || ""),
      DIRECCION: escapeHtml(direccion_barrio || ""),
      FECHA_NACIMIENTO: escapeHtml(fecha_nacimiento || ""),
      FECHA_EXPEDICION: escapeHtml(fecha_expedicion || ""),
      ESTADO_CIVIL: escapeHtml(estado_civil || ""),
      EPS: escapeHtml(eps || ""),
      AFP: escapeHtml(afp || ""),
      RH: escapeHtml(rh || ""),
      CAMISA_TALLA: escapeHtml(camisa_talla || ""),
      TALLA_PANTALON: escapeHtml(talla_pantalon || ""),
      ZAPATOS_TALLA: escapeHtml(zapatos_talla || ""),
      PHOTO_URL: foto_public_url || "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      EDUCACION_LIST,
      EXPERIENCIA_LIST,
      REFERENCIAS_LIST,
      FAMILIARES_LIST,
      CONTACTO_EMERGENCIA: CONTACTO_HTML,
      METAS: METAS_HTML,
      FECHA_GENERACION: new Date().toLocaleString(),
      LOGO_URL: process.env.LOGO_PUBLIC_URL || "https://storage.googleapis.com/logyser-recibo-public/logo.png",
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

    // ========== 7. CONFIRMAR TRANSACCIÓN DE BD ==========
    await conn.commit();
    transactionCommitted = true;
    console.log(`✅ Transacción de BD completada para: ${identificacion}`);

    // ========== 8. SUBIR FIRMA AL NUEVO BUCKET (firmas-images) ==========
    console.log('=== PROCESANDO FIRMA ===');
    let firmaUrl = null;
    const signatureData = firma_base64;

    if (signatureData && bucketFirmas && idAspirante) {
      try {
        console.log(`🖊️ Iniciando subida de firma para ID: ${identificacion}`);

        // Extraer datos base64 puros
        let base64Data = signatureData;
        if (signatureData.includes('base64,')) {
          base64Data = signatureData.split('base64,')[1];
        }

        const signatureBuffer = Buffer.from(base64Data, 'base64');

        // Nueva ruta solicitada: identificacion/firma.png
        const signatureName = `${identificacion}/firma.png`;
        const fileFirma = bucketFirmas.file(signatureName);

        console.log(`✍️ Subiendo a bucket firmas-images: ${signatureName}`);

        await fileFirma.save(signatureBuffer, {
          metadata: { contentType: 'image/png' },
          resumable: false
        });

        // URL pública en el nuevo bucket
        firmaUrl = `https://storage.googleapis.com/firmas-images/${signatureName}`;

        // Guardar la nueva URL en la BD
        await pool.query(
          `UPDATE Dynamic_hv_aspirante SET firma_url = ? WHERE id_aspirante = ?`,
          [firmaUrl, idAspirante]
        );

        // Actualizar el objeto para que el generador de PDF use la firma del nuevo bucket
        aspiranteData.FIRMA_URL = firmaUrl;

        console.log(`✅ Firma guardada en nuevo bucket: ${firmaUrl}`);
      } catch (error) {
        console.error(`❌ Error procesando firma en firmas-images: ${error.message}`);
      }
    }

    // ========== 8. GENERAR Y SUBIR PDF (FUERA DE LA TRANSACCIÓN) ==========
    let pdfResult = null;
    let pdfUrl = null;
    let pdfError = null;

    console.log(`🔄 Intentando generar PDF para: ${identificacion}`);

    if (!bucket) {
      console.warn("⚠️ Bucket no disponible, omitiendo generación de PDF");
      pdfError = "Bucket no configurado";
    } else {
      try {
        console.log(`📁 Bucket disponible: ${GCS_BUCKET}`);

        const pdfPromise = generateAndUploadPdf({
          identificacion,
          dataObjects: aspiranteData,
          idHv: idAspirante,
          bucket,
          bucketName: GCS_BUCKET,
          deleteOldFiles: true
        });



        // Timeout de 60 segundos
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_GENERANDO_PDF')), 60000)
        );

        pdfResult = await Promise.race([pdfPromise, timeoutPromise]);
        pdfUrl = pdfResult.publicUrl;

        console.log(`✅ PDF generado exitosamente:`);
        console.log(`   📁 Ruta: ${pdfResult.destName}`);
        console.log(`   🔗 URL: ${pdfUrl}`);

        // Actualizar BD con la nueva URL del PDF
        await pool.query(
          `UPDATE Dynamic_hv_aspirante SET 
            pdf_gcs_path = ?,
            pdf_public_url = ?
          WHERE identificacion = ?`,
          [pdfResult.destName, pdfUrl, identificacion]
        );
        // ==========================================================
        // NUEVO: Registro en Dynamic_hv_documentos (Config 30)
        // ==========================================================
        console.log(`📄 Registrando en Dynamic_hv_documentos para: ${identificacion}`);
        
        await pool.query(
          `INSERT INTO Dynamic_hv_documentos 
            (id_aspirante, id_config_doc, gcs_path, estado, fuente, observaciones)
          VALUES (?, ?, ?, ?, ?, NULL)`,
          [idAspirante, 30, pdfResult.destName, 'Aprobado', 'Sistema']
        );
        console.log(`✅ Registro de documento HV completado exitosamente.`);
        // ==========================================================

      } catch (pdfGenError) {
        console.error(`❌ Error generando PDF: ${pdfGenError.message}`);
        console.error(`❌ Stack trace PDF:`, pdfGenError.stack);
        pdfError = pdfGenError.message;

        console.log(`⚠️ Continuando sin PDF generado. Datos del aspirante guardados en BD.`);
      }
    }

    // ========== 9. ENVIAR CORREO (ASINCRÓNICO) ==========
    if (pdfUrl) {

      const esNuevoParaCorreo = Boolean(esNuevoRegistro);

      console.log(`📧 Enviando correo con estado: ${esNuevoParaCorreo ? 'NUEVO' : 'ACTUALIZACIÓN'}`);
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
            timestamp: new Date().toLocaleString('es-CO'),
            esNuevo: esNuevoParaCorreo
          });
          console.log("✅ Correo enviado exitosamente");
        } catch (emailError) {
          console.error("⚠️ Error enviando correo:", emailError.message);
        }
      }, 1000);
    } else if (correo_electronico) {
      console.log("⚠️ No hay URL de PDF, omitiendo envío de correo");
    }

    // ========== 10. RESPONDER AL CLIENTE ==========
    const respuesta = {
      ok: true,
      message: "Hoja de vida registrada correctamente",
      id_aspirante: idAspirante,
      identificacion: identificacion,
      datos_guardados: true
    };

    // Agregar información del PDF
    if (pdfUrl) {
      respuesta.pdf_generado = true;
      respuesta.pdf_url = pdfUrl;
      respuesta.pdf_ruta = pdfResult?.destName;
    } else {
      respuesta.pdf_generado = false;
      if (pdfError) {
        respuesta.pdf_error = pdfError;
        respuesta.message = "Hoja de vida registrada, pero hubo un error generando el PDF";
      }
    }

    console.log(`📤 Respondiendo al cliente exitosamente para: ${identificacion}`);
    return res.json(respuesta);

  } catch (error) {
    console.error("❌ Error registrando HV:", error);
    console.error("📋 Stack trace:", error.stack);

    // Revertir transacción si no fue commitida
    if (!transactionCommitted) {
      try {
        await conn.rollback();
        console.log("↩️ Transacción revertida debido a error");
      } catch (rollbackError) {
        console.error("❌ Error al hacer rollback:", rollbackError);
      }
    }

    // Respuesta de error EN JSON
    const errorResponse = {
      ok: false,
      error: "Error registrando hoja de vida",
      details: error.message,
      identificacion: identificacion || null,
      timestamp: new Date().toISOString()
    };

    return res.status(500).json(errorResponse);

  } finally {
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

async function deleteURLFromDB(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Se requiere el parámetro 'id' (identificación)"
      });
    }

    console.log(`🗑️ Intentando eliminar URLs de PDF para identificación: ${id}`);

    // Primero, verificar si el usuario existe
    const [userExists] = await pool.query(
      `SELECT identificacion FROM Dynamic_hv_aspirante WHERE identificacion = ?`,
      [id]
    );

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se ha encontrado usuario con identificación ${id}`
      });
    }

    // Actualizar los campos de PDF a NULL en lugar de eliminarlos
    const [result] = await pool.query(
      `UPDATE Dynamic_hv_aspirante 
       SET pdf_gcs_path = NULL, 
           pdf_public_url = NULL,
           fecha_actualizacion = NOW()
       WHERE identificacion = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      // Esto no debería pasar porque ya verificamos que el usuario existe
      return res.status(500).json({
        success: false,
        error: "No se pudieron actualizar los campos de PDF"
      });
    }

    console.log(`✅ URLs de PDF eliminadas para identificación: ${id}`);

    return res.status(200).json({
      success: true,
      message: `URLs de PDF eliminadas correctamente para ${id}`,
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error(`❌ Error en deleteURLFromDB:`, error);

    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error.message
    });
  }
}

app.delete('/api/hv/pdf/:id', deleteURLFromDB);

app.use("/api/correo", correoAspiranteRoutes);

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