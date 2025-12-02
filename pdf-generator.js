import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
//  CONFIGURACIÓN
// ==========================================

// IMPORTANTE: Ya NO definimos bucket ni GCS_BUCKET aquí
// Se reciben como parámetros desde server.js
const TEMPLATE_PATH = path.join(__dirname, "templates", "cv_template.html");

// ==========================================
//  FUNCIONES AUXILIARES
// ==========================================

// helper: load template file and replace placeholders
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
  }
}

// ==========================================
//  FUNCIÓN PRINCIPAL - VERSIÓN SIMPLIFICADA
// ==========================================

export async function generateAndUploadPdf({
  identificacion,
  dataObjects = {},
  destNamePrefix = "cv",
  bucket,      // REQUERIDO: bucket object de GCS
  bucketName   // REQUERIDO: nombre del bucket
}) {
  console.log(`📄 [PDF Generator] Iniciando para: ${identificacion}`);

  try {
    // ========== VALIDACIONES ==========
    if (!bucket) {
      throw new Error("Falta el parámetro 'bucket'. Pásalo desde server.js");
    }

    if (!bucketName) {
      throw new Error("Falta el parámetro 'bucketName'. Pásalo desde server.js");
    }

    console.log(`🏢 Bucket configurado: ${bucketName}`);
    console.log(`📦 Bucket object válido: ${bucket ? '✅ Sí' : '❌ No'}`);

    // ========== PREPARAR DATOS ==========
    // Asegurar LOGO_URL
    if (!dataObjects.LOGO_URL) {
      dataObjects.LOGO_URL = "https://storage.googleapis.com/logyser-recibo-public/logo.png";
    }

    // ========== CARGAR Y RENDERIZAR PLANTILLA ==========
    console.log(`📋 Buscando plantilla en: ${TEMPLATE_PATH}`);

    if (!fs.existsSync(TEMPLATE_PATH)) {
      // Intentar con nombre alternativo
      const altTemplatePath = path.join(__dirname, "templates", "hoja-vida-template.html");
      if (fs.existsSync(altTemplatePath)) {
        console.log(`📋 Usando plantilla alternativa: hoja-vida-template.html`);
        const html = await renderHtmlFromTemplate(altTemplatePath, dataObjects);
      } else {
        throw new Error(`No se encontró la plantilla. Buscada en: ${TEMPLATE_PATH}`);
      }
    }

    const html = await renderHtmlFromTemplate(TEMPLATE_PATH, dataObjects);
    console.log(`✅ Plantilla renderizada correctamente`);

    // ========== GENERAR PDF ==========
    console.log("🖨️ Generando PDF con Puppeteer...");
    const pdfBuffer = await htmlToPdfBuffer(html);
    console.log(`✅ PDF generado: ${pdfBuffer.length} bytes`);

    // ========== NOMBRE DEL ARCHIVO ==========
    const timestamp = Date.now();
    const destName = `${identificacion}/${destNamePrefix}_${timestamp}.pdf`;
    console.log(`📤 Subiendo a GCS: ${destName}`);

    // ========== SUBIR A GCS ==========
    const file = bucket.file(destName);

    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        cacheControl: 'public, max-age=31536000', // 1 año
        contentDisposition: `inline; filename="CV_${identificacion}.pdf"`
      },
      resumable: false
    });

    console.log(`✅ PDF subido exitosamente: ${destName}`);

    // ========== HACER PÚBLICO (OPCIONAL) ==========
    try {
      await file.makePublic();
      console.log(`🌍 Archivo hecho público`);
    } catch (publicError) {
      console.warn(`⚠️ No se pudo hacer público (no crítico): ${publicError.message}`);
      // Continuamos, no es crítico
    }

    // ========== GENERAR URL PÚBLICA ==========
    // URL pública DIRECTA (siempre funciona)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destName}`;

    console.log(`🔗 URL pública generada: ${publicUrl}`);

    // ========== INTENTAR SIGNED URL (OPCIONAL) ==========
    let signedUrl = null;
    try {
      const expiresMs = parseInt(
        process.env.SIGNED_URL_EXPIRES_MS ||
        String(7 * 24 * 60 * 60 * 1000), // 7 días por defecto
        10
      );

      const expiresAt = Date.now() + expiresMs;
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: expiresAt,
        version: 'v4'
      });

      signedUrl = url;
      console.log(`🔐 Signed URL generada (expira en ${expiresMs / 1000 / 60 / 60 / 24} días)`);
    } catch (signedError) {
      console.warn(`⚠️ Signed URL falló, usando solo URL pública: ${signedError.message}`);
      // No es crítico, tenemos publicUrl
    }

    // ========== RETORNAR RESULTADO ==========
    return {
      destName,
      publicUrl,      // URL pública directa (SIEMPRE disponible)
      signedUrl,      // Signed URL (opcional, puede ser null)
      size: pdfBuffer.length,
      timestamp,
      bucketName      // Para referencia
    };

  } catch (error) {
    console.error(`❌ [PDF Generator] Error para ${identificacion}:`, error.message);
    console.error("Stack trace:", error.stack);
    throw error; // Re-lanzar para manejo en server.js
  }
}

// ==========================================
//  FUNCIONES ADICIONALES (OPCIONALES)
// ==========================================

// Función para verificar si un archivo existe en GCS (útil para debug)
export async function checkFileExists(bucket, filePath) {
  if (!bucket) return false;

  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error("Error verificando archivo:", error);
    return false;
  }
}

// Función para listar archivos de un aspirante (útil para debug)
export async function listAspiranteFiles(bucket, identificacion) {
  if (!bucket) return [];

  try {
    const [files] = await bucket.getFiles({
      prefix: `${identificacion}/`
    });

    return files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      created: file.metadata.timeCreated,
      contentType: file.metadata.contentType
    }));
  } catch (error) {
    console.error("Error listando archivos:", error);
    return [];
  }
}