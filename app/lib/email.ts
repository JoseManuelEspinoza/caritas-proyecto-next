import nodemailer from "nodemailer";
import type { ConstanciaData } from "@/app/lib/constancia-pdf";

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

export async function sendBrigadistaWelcomeEmail(
  to: string,
  nombres: string,
  tempPassword: string
) {
  const loginUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/login`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@caritas-lima.pe",
    to,
    subject: "Bienvenido al sistema — Cáritas Lima",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#009850;margin-bottom:4px">Cáritas Lima</h2>
        <p style="color:#6b7280;margin-top:0">Sistema de Gestión de Riesgo de Desastres</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Hola <strong>${nombres}</strong>,</p>
        <p>Tu cuenta de acceso al sistema ha sido creada. Usa las siguientes credenciales para ingresar:</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Usuario:</strong> ${to}</p>
          <p style="margin:0"><strong>Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
        </div>
        <p style="color:#374151">Al ingresar por primera vez, el sistema te pedirá cambiar tu contraseña.</p>
        <a href="${loginUrl}"
           style="display:inline-block;background:#009850;color:#fff;padding:12px 28px;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Ingresar al sistema
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si no esperabas este correo, comunícate con el administrador del sistema.
        </p>
      </div>
    `,
  });
}

function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "Por confirmar";
  const d = new Date(iso);
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","set","oct","nov","dic"];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export async function sendAsignacionEmergenciaEmail(
  to: string,
  nombres: string,
  nombreActividad: string,
  fechaProgramada: string | null | undefined,
  lugarActividad: string | null | undefined,
  indicaciones: string
) {
  const loginUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/login`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@caritas-lima.pe",
    to,
    subject: "Asignación a emergencia — Cáritas Lima",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#009850;margin-bottom:4px">Cáritas Lima</h2>
        <p style="color:#6b7280;margin-top:0">Sistema de Gestión de Riesgo de Desastres</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Hola <strong>${nombres}</strong>,</p>
        <p>Has sido asignado/a como brigadista a la siguiente emergencia o simulacro. Por favor, revisa los detalles y preséntate puntualmente.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Actividad:</strong> ${nombreActividad}</p>
          <p style="margin:0 0 8px"><strong>Fecha programada:</strong> ${fmtFechaCorta(fechaProgramada)}</p>
          <p style="margin:0 0 8px"><strong>Lugar:</strong> ${lugarActividad ?? "Por confirmar"}</p>
          ${indicaciones ? `<p style="margin:8px 0 0"><strong>Indicaciones:</strong> ${indicaciones}</p>` : ""}
        </div>
        <p style="color:#374151">Si tienes dudas, comunícate con el especialista GRD de tu parroquia.</p>
        <a href="${loginUrl}"
           style="display:inline-block;background:#009850;color:#fff;padding:12px 28px;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Ingresar al sistema
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si no esperabas este correo, comunícate con el administrador del sistema.
        </p>
      </div>
    `,
  });
}

export async function sendCertificadoEmail(
  to: string,
  nombres: string,
  constanciaData: ConstanciaData
) {
  const loginUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/login`;
  const transporter = createTransporter();

  // Generar PDF en servidor (jsPDF funciona en Node.js con output "arraybuffer")
  const { buildConstanciaDoc } = await import("@/app/lib/constancia-pdf");
  const doc = buildConstanciaDoc(constanciaData);
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const slug = (s: string) => s.replace(/\s+/g, "-").toLowerCase();
  const nombreArchivo = `Constancia_${slug(constanciaData.nombreParticipante)}_${slug(constanciaData.nombreCurso)}.pdf`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@caritas-lima.pe",
    to,
    subject: `¡Felicitaciones! Obtuviste tu constancia — ${constanciaData.nombreCurso}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#009850;margin-bottom:4px">Cáritas Lima</h2>
        <p style="color:#6b7280;margin-top:0">Sistema de Gestión de Riesgo de Desastres</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Hola <strong>${nombres}</strong>,</p>
        <p>¡Felicitaciones! Has completado satisfactoriamente el curso y tu constancia ha sido generada. La encuentras adjunta en este correo.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Curso:</strong> ${constanciaData.nombreCurso}</p>
          ${constanciaData.codigoCurso ? `<p style="margin:0 0 8px"><strong>Código:</strong> ${constanciaData.codigoCurso}</p>` : ""}
          ${constanciaData.nota != null ? `<p style="margin:0 0 8px"><strong>Nota obtenida:</strong> ${constanciaData.nota.toFixed(1)} / 20</p>` : ""}
          ${constanciaData.fechaCertificacion ? `<p style="margin:0"><strong>Fecha:</strong> ${fmtFechaCorta(constanciaData.fechaCertificacion)}</p>` : ""}
        </div>
        <p style="color:#374151">Puedes descargar tu constancia desde el sistema en cualquier momento.</p>
        <a href="${loginUrl}"
           style="display:inline-block;background:#009850;color:#fff;padding:12px 28px;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Ver en el sistema
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si no esperabas este correo, comunícate con el administrador del sistema.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: nombreArchivo,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendDecisionComiteEmail(
  to: string,
  nombres: string,
  incidenciaTitulo: string,
  decision: "APROBAR" | "OBSERVAR" | "RECHAZAR",
  observaciones?: string | null
) {
  const loginUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/login`;
  const transporter = createTransporter();

  const labels: Record<typeof decision, { titulo: string; color: string; mensaje: string }> = {
    APROBAR: {
      titulo: "Caso Aprobado por el Comité",
      color: "#009850",
      mensaje: "El Comité de donaciones ha <strong>aprobado</strong> el caso. Puedes proceder con la etapa de atención.",
    },
    OBSERVAR: {
      titulo: "Caso Devuelto con Observaciones",
      color: "#d97706",
      mensaje: "El Comité de donaciones ha devuelto el caso con observaciones. Por favor revisa las indicaciones y corrige el informe.",
    },
    RECHAZAR: {
      titulo: "Caso Rechazado por el Comité",
      color: "#dc2626",
      mensaje: "El Comité de donaciones ha <strong>rechazado</strong> el caso. Revisa el motivo indicado.",
    },
  };

  const { titulo, color, mensaje } = labels[decision];

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@caritas-lima.pe",
    to,
    subject: `${titulo} — Cáritas Lima`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#009850;margin-bottom:4px">Cáritas Lima</h2>
        <p style="color:#6b7280;margin-top:0">Sistema de Gestión de Riesgo de Desastres</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Hola <strong>${nombres}</strong>,</p>
        <p>${mensaje}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Incidencia:</strong> ${incidenciaTitulo}</p>
          ${observaciones ? `<p style="margin:8px 0 0"><strong>Observaciones del Comité:</strong> ${observaciones}</p>` : ""}
        </div>
        <a href="${loginUrl}"
           style="display:inline-block;background:${color};color:#fff;padding:12px 28px;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Ver caso en el sistema
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si no esperabas este correo, comunícate con el administrador del sistema.
        </p>
      </div>
    `,
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
