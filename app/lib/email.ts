import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Gmail: puerto 465 usa SSL directo, 587 usa STARTTLS
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    // Gmail rechaza conexiones sin TLS válido en producción
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/recuperar/${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@caritas-lima.pe",
    to,
    subject: "Recuperación de contraseña — Cáritas Lima",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#b91c1c;margin-bottom:4px">Cáritas Lima</h2>
        <p style="color:#6b7280;margin-top:0">Sistema de gestión</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el botón para crear una nueva. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#b91c1c;color:#fff;padding:12px 28px;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:13px">
          Si no solicitaste esto, ignora este mensaje.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si el botón no funciona, copia este enlace:<br/>
          <a href="${resetUrl}" style="color:#b91c1c">${resetUrl}</a>
        </p>
      </div>
    `,
  });
}
