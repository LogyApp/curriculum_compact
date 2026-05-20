/**
 * Email Service
 * Sends CV confirmation emails to aspirants via Nodemailer (Gmail SMTP).
 *
 * Relocated from: send-to-email.js
 */

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a CV confirmation email to the aspirant.
 * @param {object} params
 * @param {string} params.to            - Recipient email
 * @param {string} params.nombreCompleto - Full name
 * @param {string} params.pdfUrl        - Public URL of the generated PDF
 * @param {boolean} params.isNew        - true if first registration, false if update
 */
export async function enviarCorreoAspirante({ to, nombreCompleto, pdfUrl, isNew }) {
  if (!to || !to.includes('@')) {
    console.warn('[email] Invalid recipient address, skipping email:', to);
    return;
  }

  const asunto = isNew
    ? 'Registro de hoja de vida exitoso — Logyser S.A.S'
    : 'Actualización de hoja de vida — Logyser S.A.S';

  const accion = isNew ? 'registrada' : 'actualizada';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${asunto}</title>
    </head>
    <body style="margin:0;padding:0;background:#F4F6FB;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,28,63,.1);">
            <!-- Header -->
            <tr>
              <td style="background:#1B2A5E;padding:24px 32px;">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">Logyser S.A.S</p>
                <p style="margin:4px 0 0;color:rgba(255,255,255,.55);font-size:12px;">Sistema de Selección de Personal</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F1C3F;">
                  Hoja de vida ${accion}
                </p>
                <p style="margin:0 0 20px;font-size:14px;color:#5A6A8A;">
                  Hola <strong>${nombreCompleto}</strong>, tu hoja de vida ha sido ${accion} exitosamente en nuestro sistema.
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#5A6A8A;line-height:1.6;">
                  Puedes consultar y descargar tu hoja de vida en el siguiente enlace. Guárdalo para futuras referencias.
                </p>
                <a href="${pdfUrl}" target="_blank"
                   style="display:inline-block;background:#F15A22;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                  Ver hoja de vida (PDF)
                </a>
                <hr style="border:none;border-top:1px solid #E2E7F0;margin:28px 0;">
                <p style="margin:0;font-size:12px;color:#9AA5BF;line-height:1.6;">
                  Este correo fue generado automáticamente. Si no realizaste este registro, por favor comunícate con el área de Recursos Humanos de Logyser S.A.S.<br><br>
                  Los datos suministrados están protegidos bajo la Ley 1581 de 2012 — Régimen de Protección de Datos Personales de Colombia.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#F4F6FB;padding:16px 32px;border-top:1px solid #E2E7F0;">
                <p style="margin:0;font-size:11px;color:#9AA5BF;text-align:center;">
                  Logyser S.A.S — Todos los derechos reservados
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

  await transporter.sendMail({
    from: `"Logyser S.A.S — Recursos Humanos" <${process.env.EMAIL_USER}>`,
    to,
    subject: asunto,
    html,
  });

  console.log(`[email] Sent to ${to} — ${asunto}`);
}
