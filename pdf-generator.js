import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { Storage } from "@google-cloud/storage";
import { fileURLToPath } from "url";

const GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
const LOGO_GCS_BUCKET = process.env.LOGO_GCS_BUCKET || "logyser-public"; // bucket donde está el logo
const LOGO_GCS_PATH = process.env.LOGO_GCS_PATH || "logo/logyser_horizontal.png"; // ruta dentro del bucket
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "eternal-brand-454501-i8",
});

const bucket = storage.bucket(GCS_BUCKET);

// Resolve template path relative to this module (robusto en dev/contener)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "templates", "cv_template.html");

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

// helper: try to download logo from GCS and return data URL, otherwise return public URL fallback
async function getLogoDataUrl() {
  try {
    const logoBucket = storage.bucket(LOGO_GCS_BUCKET);
    const logoFile = logoBucket.file(LOGO_GCS_PATH);

    // comprobar existencia
    const [exists] = await logoFile.exists();
    if (exists) {
      const [buffer] = await logoFile.download();
      // intentar metadata para contentType
      let contentType = "image/png";
      try {
        const [meta] = await logoFile.getMetadata();
        if (meta && meta.contentType) contentType = meta.contentType;
      } catch (errMeta) {
        // ignore
      }
      const base64 = buffer.toString("base64");
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    console.warn("No se pudo descargar logo desde GCS:", err && err.message ? err.message : err);
  }

  // fallback público
  return `https://storage.googleapis.com/${LOGO_GCS_BUCKET}/${LOGO_GCS_PATH}`;
}

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export async function generateAndUploadPdf({
  identificacion,
  dataObjects = {},
  destNamePrefix = "cv",
  bucket,  // ← ¡NUEVO PARÁMETRO REQUERIDO!
  bucketName  // ← ¡NUEVO PARÁMETRO REQUERIDO!
}) {
  console.log(`📄 [PDF Generator] Iniciando para: ${identificacion}`);

  try {
    // VALIDACIONES CRÍTICAS
    if (!bucket) {
      throw new Error("❌ 'bucket' es requerido. Pásalo desde server.js");
    }

    if (!bucketName) {
      throw new Error("❌ 'bucketName' es requerido. Pásalo desde server.js");
    }

    console.log(`🏢 Bucket recibido: ${bucketName}`);
    console.log(`📦 Bucket object: ${bucket ? 'OK' : 'NULL'}`);

    // Asegurar LOGO_URL
    if (!dataObjects.LOGO_URL) {
      dataObjects.LOGO_URL = "https://storage.googleapis.com/logyser-recibo-public/logo.png";
    }

    // 1. Cargar y renderizar plantilla
    const templatePath = path.join(__dirname, 'templates', 'hoja-vida-template.html');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`❌ Plantilla no encontrada: ${templatePath}`);
    }

    console.log(`📋 Usando plantilla: ${templatePath}`);
    const html = await renderHtmlFromTemplate(templatePath, dataObjects);

    // 2. Generar PDF
    console.log("🖨️ Generando PDF con Puppeteer...");
    const pdfBuffer = await htmlToPdfBuffer(html);
    console.log(`✅ PDF generado: ${pdfBuffer.length} bytes`);

    // 3. Nombre del archivo (mismo formato que ya funciona)
    const timestamp = Date.now();
    const destName = `${identificacion}/${destNamePrefix}_${timestamp}.pdf`;

    console.log(`📤 Subiendo a GCS: ${destName}`);

    // 4. Subir a GCS
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

    // 5. Intentar hacer público (opcional pero útil)
    try {
      await file.makePublic();
      console.log(`🌍 Archivo hecho público: ${destName}`);
    } catch (publicError) {
      console.warn(`⚠️ No se pudo hacer público: ${publicError.message}`);
      // No es crítico, continuamos
    }

    // 6. Generar URL (SIEMPRE usar URL pública como fallback seguro)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destName}`;
    let finalUrl = publicUrl;

    // Intentar signed URL como opción premium
    try {
      const expiresMs = parseInt(process.env.SIGNED_URL_EXPIRES_MS || String(7 * 24 * 60 * 60 * 1000), 10);
      const expiresAt = Date.now() + expiresMs;

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: expiresAt,
        version: 'v4'
      });

      if (signedUrl) {
        finalUrl = signedUrl;
        console.log(`🔐 Signed URL generada (expira en ${expiresMs / 1000 / 60 / 60 / 24} días)`);
      }
    } catch (signedError) {
      console.warn(`⚠️ Signed URL falló, usando URL pública: ${signedError.message}`);
      // Usamos publicUrl como fallback
    }

    console.log(`🔗 URL final: ${finalUrl}`);

    return {
      destName,
      signedUrl: finalUrl,
      publicUrl, // URL pública directa (siempre funciona)
      size: pdfBuffer.length,
      timestamp
    };

  } catch (error) {
    console.error(`❌ [PDF Generator] Error para ${identificacion}:`, error);
    throw error;
  }
}