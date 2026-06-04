"use server";

// ─────────────────────────────────────────────────────────────────────────────
// Consulta de DNI (datos RENIEC) SIN costo, vía un proveedor gratuito configurable.
//
// IMPORTANTE: la API oficial de RENIEC es de pago. Existen APIs públicas que
// consultan RENIEC con un TOKEN GRATUITO (registro gratis, con límite diario).
// Esta acción es agnóstica: configura el proveedor con variables de entorno y
// no cambies código. El token vive solo en el servidor (no se expone al cliente).
//
// Variables de entorno (.env):
//   RENIEC_API_URL   URL del endpoint. Usa {dni} como marcador. Ejemplos:
//                    - https://api.apis.net.pe/v2/reniec/dni?numero={dni}
//                    - https://dniruc.apisperu.com/api/v1/dni/{dni}?token={token}
//                    - https://api.apiperu.dev/api/dni/{dni}
//   RENIEC_API_TOKEN Token gratuito del proveedor (si lo requiere).
//   RENIEC_AUTH_MODE 'bearer' (Authorization: Bearer) | 'query' (?token=) | 'none'
//                    Por defecto: 'bearer'.
// ─────────────────────────────────────────────────────────────────────────────

export type DatosDni = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
};

type Resultado = { ok: true; datos: DatosDni } | { ok: false; error: string };

/** Extrae los campos sin importar la forma del JSON del proveedor. */
function normalizar(json: Record<string, unknown>): DatosDni | null {
  // Algunos proveedores envuelven en { data: {...} } o { result: {...} }
  const d = (json.data ?? json.result ?? json) as Record<string, unknown>;
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const nombres = str("nombres", "name", "first_name", "prenombres");
  const apellidoPaterno = str(
    "apellidoPaterno",
    "apellido_paterno",
    "ape_paterno",
    "first_last_name",
    "apepaterno"
  );
  const apellidoMaterno = str(
    "apellidoMaterno",
    "apellido_materno",
    "ape_materno",
    "second_last_name",
    "apematerno"
  );
  if (!nombres && !apellidoPaterno) return null;
  return { nombres, apellidoPaterno, apellidoMaterno };
}

export async function consultarDni(dni: string): Promise<Resultado> {
  const numero = (dni ?? "").replace(/\D/g, "");
  if (numero.length !== 8) return { ok: false, error: "El DNI debe tener 8 dígitos." };

  const urlTpl = process.env.RENIEC_API_URL;
  if (!urlTpl) {
    return {
      ok: false,
      error: "Consulta DNI no configurada. Define RENIEC_API_URL en el servidor.",
    };
  }
  // Sanea el token (por si quedó con prefijo "token=" o espacios).
  const token = (process.env.RENIEC_API_TOKEN ?? "").replace(/^token=/i, "").trim();
  const authMode = (process.env.RENIEC_AUTH_MODE ?? "bearer").toLowerCase();

  let url = urlTpl.replace("{dni}", numero).replace("{token}", encodeURIComponent(token));
  if (!url.includes(numero)) url += (url.includes("?") ? "&" : "?") + `numero=${numero}`;
  if (authMode === "query" && token && !url.includes("token=")) {
    url += (url.includes("?") ? "&" : "?") + `token=${encodeURIComponent(token)}`;
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (authMode === "bearer" && token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return { ok: false, error: "No se encontró un DNI con ese número." };
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Token de consulta inválido o vencido." };
    if (res.status === 429) return { ok: false, error: "Límite de consultas alcanzado por hoy." };
    if (!res.ok) return { ok: false, error: `El servicio de consulta respondió ${res.status}.` };

    const json = await res.json();
    const datos = normalizar(json as Record<string, unknown>);
    if (!datos) return { ok: false, error: "La respuesta no contiene datos de la persona." };
    return { ok: true, datos };
  } catch {
    return { ok: false, error: "No se pudo contactar el servicio de consulta de DNI." };
  }
}
