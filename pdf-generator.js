import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
//  CONFIGURACIÓN
// ==========================================

// IMPORTANTE: Usar TEMPLATE_PATH constante, no hardcodear
const TEMPLATE_PATH = path.join(__dirname, "templates", "cv_template.html");
const ALT_TEMPLATE_PATH = path.join(__dirname, "templates", "hoja-vida-template.html");

// ==========================================
//  FUNCIONES AUXILIARES
// ==========================================

async function renderHtmlFromTemplate(templatePath, data) {
  let html = await fs.readFile(templatePath, "utf8");
  // Simple placeholder replacement: {{KEY}}
  Object.entries(data).forEach(([k, v]) => {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, "g");
    html = html.replace(re, v != null ? String(v) : "");
  });
  return html;
}

async function htmlToPdfBuffer(html) {
  console.log("🚀 Iniciando Puppeteer...");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new"  // Usar nuevo headless mode
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        bottom: "12mm",
        left: "12mm",
        right: "12mm"
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
    console.log("✅ Puppeteer cerrado");
  }
}

export async function generateAndUploadPdf({
  identificacion,
  dataObjects = {},
  idHv,
  bucket,
  bucketName,
  deleteOldFiles = true
}) {
  console.log(`📄 [PDF Generator] Iniciando para: ${identificacion}, ID_HV: ${idHv || 'no proporcionado'}`);

  try {
    // ========== VALIDACIONES ==========
    if (!bucket) {
      throw new Error("❌ 'bucket' es requerido. Pásalo desde server.js");
    }

    if (!bucketName) {
      throw new Error("❌ 'bucketName' es requerido. Pásalo desde server.js");
    }

    if (!idHv) {
      throw new Error("❌ 'idHv' es requerido para generar el nombre del archivo en el formato {identificación}.HDV.{id}");
    }

    console.log(`🏢 Bucket recibido: ${bucketName}`);

    // ========== LIMPIAR ARCHIVOS ANTIGUOS ==========
    if (deleteOldFiles) {
      try {
        console.log(`🧹 Buscando PDFs antiguos para: ${identificacion}`);

        // NUEVO: Buscar archivos con el patrón {identificacion}.HDV.*.pdf
        const [files] = await bucket.getFiles();

        // Filtrar archivos que coincidan con el patrón
        const pattern = new RegExp(`^${identificacion}\\.HDV\\.\\d+\\.pdf$`);
        const oldPdfFiles = files.filter(file => pattern.test(file.name));

        if (oldPdfFiles.length > 0) {
          console.log(`📁 Encontrados ${oldPdfFiles.length} PDFs antiguos con el patrón ${identificacion}.HDV.*.pdf`);

          // Eliminar en paralelo
          await Promise.all(
            oldPdfFiles.map(file => {
              console.log(`   🗑️ Eliminando: ${file.name}`);
              return file.delete();
            })
          );

          console.log(`✅ PDFs antiguos eliminados exitosamente`);
        } else {
          console.log(`📁 No se encontraron PDFs antiguos con el patrón especificado`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Error limpiando archivos antiguos: ${cleanupError.message}`);
        // NO lanzar error, continuar con la generación del nuevo PDF
      }
    }

    // ========== ENCONTRAR PLANTILLA ==========
    let templatePath = null;

    // Primero intentar con cv_template.html
    if (await fileExists(TEMPLATE_PATH)) {
      templatePath = TEMPLATE_PATH;
      console.log(`📋 Plantilla encontrada: cv_template.html`);
    }
    // Si no existe, intentar con hoja-vida-template.html
    else if (await fileExists(ALT_TEMPLATE_PATH)) {
      templatePath = ALT_TEMPLATE_PATH;
      console.log(`📋 Plantilla alternativa encontrada: hoja-vida-template.html`);
    }
    // Si ninguna existe, ERROR
    else {
      throw new Error(`❌ No se encontró ninguna plantilla. Buscada en:
        1. ${TEMPLATE_PATH}
        2. ${ALT_TEMPLATE_PATH}`);
    }

    // ========== PREPARAR DATOS ==========
    // Asegurar LOGO_URL
    if (!dataObjects.LOGO_URL) {
      dataObjects.LOGO_URL = "https://storage.googleapis.com/logyser-recibo-public/logo.png";
    }

    // ========== RENDERIZAR HTML ==========
    console.log(`🔄 Renderizando plantilla...`);
    const html = await renderHtmlFromTemplate(templatePath, dataObjects);
    console.log(`✅ Plantilla renderizada`);

    // ========== GENERAR PDF ==========
    console.log("🖨️ Generando PDF...");
    const pdfBuffer = await htmlToPdfBuffer(html);
    console.log(`✅ PDF generado: ${pdfBuffer.length} bytes`);

    // ========== NOMBRE DEL ARCHIVO (NUEVO FORMATO) ==========
    // Formato: {identificación}.HDV.{id en la base de datos}.pdf
    const destName = `${identificacion}/${identificacion}.HDV.${idHv}.pdf`;
    console.log(`📤 Subiendo a GCS con nuevo formato: ${destName}`);

    // ========== SUBIR A GCS ==========
    const file = bucket.file(destName);

    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        cacheControl: 'public, max-age=31536000',
        contentDisposition: `inline; filename="HV_${identificacion}.pdf"`
      },
      resumable: false
    });

    console.log(`✅ PDF subido exitosamente: ${destName}`);

    // ========== HACER PÚBLICO ==========
    try {
      await file.makePublic();
      console.log(`🌍 Archivo hecho público`);
    } catch (publicError) {
      console.warn(`⚠️ No se pudo hacer público: ${publicError.message}`);
      // No crítico
    }

    // ========== GENERAR URL PÚBLICA ==========
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destName}`;

    console.log(`🔗 URL pública generada: ${publicUrl}`);

    // ========== INTENTAR SIGNED URL ==========
    let signedUrl = null;
    try {
      const expiresMs = parseInt(
        process.env.SIGNED_URL_EXPIRES_MS ||
        String(7 * 24 * 60 * 60 * 1000), // 7 días
        10
      );

      const expiresAt = Date.now() + expiresMs;
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: expiresAt,
        version: 'v4'
      });

      signedUrl = url;
      console.log(`🔐 Signed URL generada`);
    } catch (signedError) {
      console.warn(`⚠️ Signed URL falló: ${signedError.message}`);
    }

    // ========== RETORNAR RESULTADO ==========
    return {
      destName,
      publicUrl,      // URL pública (SIEMPRE funciona)
      signedUrl,      // Signed URL (opcional)
      size: pdfBuffer.length,
      timestamp: Date.now(),
      idHv            // Devolvemos el ID para referencia
    };

  } catch (error) {
    console.error(`❌ [PDF Generator] Error para ${identificacion}:`, error.message);
    console.error("📋 Stack trace:", error.stack);
    throw error;
  }
}
// ==========================================
//  FUNCIONES AUXILIARES ADICIONALES
// ==========================================

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Función para debug: verificar plantillas disponibles
export async function checkTemplates() {
  const templates = [
    { name: "cv_template.html", path: TEMPLATE_PATH },
    { name: "hoja-vida-template.html", path: ALT_TEMPLATE_PATH }
  ];

  const results = [];

  for (const template of templates) {
    const exists = await fileExists(template.path);
    results.push({
      name: template.name,
      path: template.path,
      exists,
      size: exists ? (await fs.stat(template.path)).size : 0
    });
  }

  return results;
}