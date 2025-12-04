import nodemailer from "nodemailer";

async function enviarCorreoAspirante({
  nombre,
  identificacion,
  correo,
  telefono,
  pdf_url,
  timestamp,
  esNuevo = true
}) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'logyser.noreply@gmail.com',
      pass: 'iroa eygz smjw wluh'
    }
  });

  // ASUNTO INTELIGENTE: Diferencia entre nuevo y actualización
  const tipoRegistro = esNuevo ? "Nuevo aspirante registrado" : "Aspirante actualizado";
  const asunto = `${tipoRegistro} — ${nombre} (${identificacion})`;

  const textoPlano = `
${esNuevo ? "Se ha registrado un nuevo aspirante" : "Se ha actualizado la información de un aspirante"} en Logyser.

Nombre: ${nombre}
Identificación: ${identificacion}
Correo: ${correo}
Teléfono: ${telefono}
${pdf_url ? `Hoja de vida (PDF): ${pdf_url}` : 'Hoja de vida: No disponible temporalmente'}
${esNuevo ? `Fecha registro: ${timestamp}` : `Fecha actualización: ${timestamp}`}

Revisa en LogyApp para más detalles.
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        
        /* HEADER DIFERENCIADO */
        .header-nuevo { 
          background: linear-gradient(135deg, #000B59 0%, #1a237e 100%); 
          color: white; 
          padding: 25px 20px; 
          text-align: center; 
        }
        .header-actualizado { 
          background: linear-gradient(135deg, #F15300 0%, #ff7043 100%); 
          color: white; 
          padding: 25px 20px; 
          text-align: center; 
        }
        
        .content { padding: 30px; }
        .info-row { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; color: #333; display: inline-block; width: 140px; }
        .info-value { color: #555; }
        .pdf-section { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border-left: 4px solid #F15300; }
        .pdf-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #F15300 0%, #ff7043 100%); 
          color: white; 
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: bold;
          font-size: 16px;
          margin: 10px 0;
          box-shadow: 0 4px 6px rgba(241, 83, 0, 0.2);
          transition: all 0.3s ease;
        }
        .pdf-button:hover {
          background: linear-gradient(135deg, #e64a19 0%, #ff5722 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(241, 83, 0, 0.3);
        }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; text-align: center; }
        .logo { color: #000B59; font-weight: bold; font-size: 18px; }
        .note { font-size: 12px; color: #888; margin-top: 8px; }
        .no-pdf { 
          background: #fff3e0; 
          padding: 15px; 
          border-radius: 6px; 
          border-left: 4px solid #ff9800;
          color: #e65100;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
          vertical-align: middle;
        }
        .badge-nuevo {
          background: #10b981;
          color: white;
        }
        .badge-actualizado {
          background: #f59e0b;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- HEADER DINÁMICO SEGÚN TIPO DE REGISTRO -->
        <div class="${esNuevo ? 'header-nuevo' : 'header-actualizado'}">
          <h2 style="margin: 0; font-size: 24px;">
            ${esNuevo ? '📄 Nuevo Aspirante Registrado' : '✏️ Aspirante Actualizado'}
            <span class="badge ${esNuevo ? 'badge-nuevo' : 'badge-actualizado'}">
              ${esNuevo ? 'NUEVO' : 'ACTUALIZADO'}
            </span>
          </h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">Sistema de Hojas de Vida - Logyser</p>
        </div>
        
        <div class="content">
          <div class="info-row">
            <span class="info-label">👤 Nombre:</span>
            <span class="info-value">${nombre}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">🆔 Identificación:</span>
            <span class="info-value">${identificacion}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">📧 Correo:</span>
            <span class="info-value">${correo}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">📱 Teléfono:</span>
            <span class="info-value">${telefono}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">📅 ${esNuevo ? 'Fecha registro' : 'Fecha actualización'}:</span>
            <span class="info-value">${timestamp}</span>
          </div>
          
          ${pdf_url ? `
            <div class="pdf-section">
              <h3 style="margin-top: 0; color: #333;">📋 Hoja de Vida PDF Disponible</h3>
              <p style="color: #666; margin-bottom: 20px;">Puedes ver la hoja de vida completa haciendo clic en el botón:</p>
              
              <a href="${pdf_url}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="pdf-button">
                 👁️ VER HOJA DE VIDA (PDF)
              </a>
              
              <p class="note">🔗 Enlace directo: <a href="${pdf_url}" style="color: #000B59; word-break: break-all;">${pdf_url}</a></p>
              <p class="note">⏱️ El enlace se abrirá en una nueva pestaña del navegador</p>
            </div>
          ` : `
            <div class="no-pdf">
              <h3 style="margin-top: 0; color: #e65100;">⚠️ PDF Temporalmente No Disponible</h3>
              <p>La hoja de vida en formato PDF no está disponible en este momento.</p>
              <p>Puedes consultar la información del aspirante directamente en LogyApp.</p>
            </div>
          `}
          
          <div class="footer">
            <p>
              <span class="logo">LOGSYER</span> | Sistema de Gestión de Aspirantes
            </p>
            <p style="font-size: 12px; color: #999;">
              Este es un correo automático. No responder a esta dirección.
              <br>
              Fecha de envío: ${new Date().toLocaleString('es-CO')}
              <br>
              Tipo de operación: ${esNuevo ? 'Registro nuevo' : 'Actualización de datos'}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: '"Logyser Notificaciones" <logyser.noreply@gmail.com>',
    to: "seguimientologyser@gmail.com",
    subject: asunto,
    text: textoPlano,
    html: html
  });

  console.log("✅ Correo enviado exitosamente:", info.messageId);
  console.log("📎 PDF URL incluida:", pdf_url || "No disponible");
  console.log("📌 Tipo de registro:", esNuevo ? "Nuevo" : "Actualización");

  return info.messageId;
}

export default enviarCorreoAspirante;