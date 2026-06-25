import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  FileText,
  UserCheck,
  Users,
  ClipboardList,
  BarChart3,
  Package,
  ShieldCheck,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import { InfoField } from "@/app/ui/grd/incidente/components/InfoField";
import { ResumenBloque } from "@/app/ui/grd/incidente/components/ResumenBloque";
import { EvidenciasRegistro } from "@/app/ui/grd/incidente/components/EvidenciasRegistro";
import { NotificacionesHistorial } from "@/app/ui/grd/incidente/components/NotificacionesHistorial";
import { fmtDate, fmtDateTime } from "@/app/ui/grd/incidente/lib/format";

function parseCausa(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.causa === "string") return parsed.causa || "—";
  } catch {
    // not JSON, return as-is
  }
  return raw;
}

/** Paso "Resumen Final": recorre todas las etapas del caso con sus documentos (solo lectura). */
export function ResumenStep({ data }: { data: IncidenciaDetalleOutput }) {
  const [descargando, setDescargando] = useState(false);

  const parse = (s: string | null | undefined) => parseInforme<Record<string, unknown>>(s);
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).map((x) => x.trim()).filter(Boolean) : [];

  const campoInf = data.informes.find((i) => i.tipo === "CAMPO");
  const evalInf = data.informes.find((i) => i.tipo === "EVALUACION");
  const campo = parse(campoInf?.contenido);
  const sc = parse(evalInf?.contenido);

  type RArt = { codigo: string; descripcion: string; cantidad: number };
  type RFam = { refId: string; nombre: string; kits: { tipoKit: string; articulos: RArt[] }[] };
  const familiasEval: RFam[] = Array.isArray(sc?.asignacionFamilias)
    ? (sc.asignacionFamilias as unknown[]).map((af) => {
        const a = af as Record<string, unknown>;
        return {
          refId: str(a.refId),
          nombre: str(a.nombre, "Familia"),
          kits: Array.isArray(a.kits)
            ? (a.kits as unknown[]).map((k) => {
                const kit = k as Record<string, unknown>;
                return {
                  tipoKit: str(kit.tipoKit),
                  articulos: Array.isArray(kit.articulos)
                    ? (kit.articulos as unknown[]).map((art) => {
                        const ar = art as Record<string, unknown>;
                        return {
                          codigo: str(ar.codigo),
                          descripcion: str(ar.descripcion),
                          cantidad: typeof ar.cantidad === "number" ? ar.cantidad : 1,
                        };
                      })
                    : [],
                };
              })
            : [],
        };
      })
    : [];

  const grupoDe = (refId: string) => data.gruposFamiliares.find((g) => g.id === refId);
  const integrantesDe = (refId: string): string[] =>
    (grupoDe(refId)?.personas ?? []).map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());

  const notasFamilias: { id: string; nota: string }[] = Array.isArray(campo?.notasFamilias)
    ? (campo!.notasFamilias as { id: string; nota: string }[])
    : [];

  const totalPersonas = data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0);
  const respBrig = data.asignaciones.find((a) => a.esResponsable);
  const equipo = data.asignaciones.filter((a) => !a.esResponsable);
  const cerrado = data.estadoActual === "CERRADO";

  async function descargarInformePdf() {
    if (!sc) return;
    setDescargando(true);
    try {
      const { generarInformePdf } = await import("@/app/lib/informe-pdf");
      await generarInformePdf({
        codigo: data.codigoCaso ?? "GRD",
        categoria: data.tipoEvento ?? "—",
        evento: data.tituloIncidencia ?? data.codigoCaso ?? "Incidencia",
        ubicacion: [data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—",
        fechaSuceso: fmtDate(data.fechaRegistro),
        familiasAfectadas: data.gruposFamiliares.length,
        personasEmpadronadas: totalPersonas,
        fechaEmision: fmtDate(evalInf?.fecha ?? data.fechaRegistro),
        emitidoPor: "Especialista GRD",
        oficina: "Oficina de Gestión Pastoral / GRD",
        motivo: str(sc.motivo),
        dirigidoA: str(sc.dirigidoA, "Comité de donaciones"),
        objetivoGeneral: str(sc.objetivoGeneral),
        objetivosEspecificos: arr(sc.objetivosEspecificos),
        analisisSituacion: str(sc.analisisSituacion),
        hallazgosTexto: str(sc.hallazgosTexto),
        hallazgosClave: arr(sc.hallazgosClave),
        necesidadesIdentificadas: [],
        evidenciasCount: data.evidencias.length,
        evidenciasImagenes: [],
        familias: familiasEval.map((f) => ({
          nombre: f.nombre,
          integrantes: integrantesDe(f.refId),
          kits: f.kits,
        })),
        conclusiones: str(sc.conclusiones),
      });
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner de estado */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${
        cerrado
          ? "bg-green-100 border-green-300"
          : "bg-[#009850]/10 border-[#009850]/30"
      }`}>
        <div className="w-11 h-11 rounded-xl bg-green-200 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-green-900 text-base">
            Caso {cerrado ? "cerrado" : data.estadoActual}
          </p>
          <p className="text-sm text-green-700">
            {data.codigoCaso} · Registrado el {fmtDate(data.fechaRegistro)}
          </p>
        </div>
        <span className="text-[11px] font-bold bg-green-200 text-green-800 px-3 py-1 rounded-full uppercase flex-shrink-0">
          {data.estadoActual}
        </span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        {[
          { label: "Familias", value: data.gruposFamiliares.length, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Personas", value: totalPersonas, color: "bg-purple-50 border-purple-200 text-purple-700" },
          { label: "Informes", value: data.informes.length, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Entregas", value: data.entregas.length, color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
          { label: "Documentos", value: data.evidencias.length, color: "bg-green-50 border-green-200 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 1. Datos del evento */}
      <ResumenBloque icon={FileText} titulo="1. Registro del evento">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label="Categoría" value={data.tipoEvento ?? "—"} />
          <InfoField label="Gravedad" value={data.gravedad ?? "—"} />
          <InfoField label="Fecha del suceso" value={fmtDate(data.fechaRegistro)} />
          <InfoField label="Parroquia / Distrito" value={data.parroquia ?? "—"} />
          <InfoField label="Dirección" value={data.direccionEvento ?? "—"} />
          <InfoField label="Causa" value={parseCausa(data.causa)} />
        </div>
        {data.descripcionEvento && <InfoField label="Descripción" value={data.descripcionEvento} />}
        {data.aviso && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Reportado por</p>
            <p className="text-sm text-gray-800">{data.aviso.nombreInformante ?? "—"}</p>
            {data.aviso.telefonoInformante && (
              <p className="text-xs text-gray-500">Tel: {data.aviso.telefonoInformante}</p>
            )}
            {data.aviso.descripcion && (
              <p className="text-xs text-gray-600 mt-1">{data.aviso.descripcion}</p>
            )}
          </div>
        )}
      </ResumenBloque>

      {/* 2. Equipo asignado */}
      <ResumenBloque
        icon={UserCheck}
        titulo="2. Equipo asignado"
        contador={`${data.asignaciones.length || (data.responsableGRD ? 1 : 0)} responsable(s)`}
      >
        {data.responsableGRD ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-[10px] text-blue-700 uppercase font-semibold">
              Especialista GRD — Responsable único
            </p>
            <p className="text-sm font-semibold text-gray-900">{data.responsableGRD.nombre}</p>
            {data.responsableGRD.correo && (
              <p className="text-xs text-gray-500">{data.responsableGRD.correo}</p>
            )}
          </div>
        ) : data.asignaciones.length > 0 ? (
          <div className="space-y-2">
            {respBrig && (
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Responsable:</span> {respBrig.nombres}{" "}
                {respBrig.apellidos ?? ""}
                {respBrig.parroquia ? ` · ${respBrig.parroquia}` : ""}
              </p>
            )}
            {equipo.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Integrantes</p>
                <div className="flex flex-wrap gap-1">
                  {equipo.map((m) => (
                    <span
                      key={m.brigadistaId}
                      className="text-[11px] bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 text-gray-700"
                    >
                      {m.nombres} {m.apellidos ?? ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Sin equipo registrado.</p>
        )}
        {data.instruccionesAsignacion && (
          <InfoField label="Instrucciones" value={data.instruccionesAsignacion} />
        )}
      </ResumenBloque>

      {/* 3. Empadronamiento */}
      <ResumenBloque
        icon={Users}
        titulo="3. Empadronamiento"
        contador={`${data.gruposFamiliares.length} familia(s) · ${totalPersonas} persona(s)`}
      >
        {data.gruposFamiliares.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin grupos familiares registrados.</p>
        ) : (
          <div className="space-y-2">
            {data.gruposFamiliares.map((g) => (
              <div key={g.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1.5">
                  {g.nombreReferencia ?? "Grupo familiar"}{" "}
                  <span className="text-[11px] font-normal text-gray-400">
                    · {g.personas.length} persona(s)
                  </span>
                </p>
                <ul className="space-y-1">
                  {g.personas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-700">
                        {p.nombres} {p.apellidos ?? ""}
                        {p.parentesco && <span className="text-gray-400"> · {p.parentesco}</span>}
                        {p.condicionEspecial && (
                          <span className="ml-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5">
                            {p.condicionEspecial}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {p.edad ? `${p.edad}a` : ""}
                        {p.numeroDocumento ? ` · ${p.tipoDocumento ?? "DOC"} ${p.numeroDocumento}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </ResumenBloque>

      {/* 4. Levantamiento de campo */}
      {campo && (
        <ResumenBloque icon={ClipboardList} titulo="4. Levantamiento de campo">
          {str(campo.nivelVulnerabilidad) && (
            <InfoField label="Nivel de vulnerabilidad" value={str(campo.nivelVulnerabilidad)} />
          )}
          {str(campo.descripcionEvento) &&
            str(campo.descripcionEvento) !== "Levantamiento de campo realizado." && (
              <InfoField label="Descripción de campo" value={str(campo.descripcionEvento)} />
            )}
          {str(campo.observaciones) && (
            <InfoField label="Observaciones" value={str(campo.observaciones)} />
          )}
          {str(campo.recomendacion) && (
            <InfoField label="Recomendación" value={str(campo.recomendacion)} />
          )}
          {notasFamilias.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Notas por familia
              </p>
              <ul className="space-y-1">
                {notasFamilias.map((n, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    <span className="font-semibold">
                      {grupoDe(n.id)?.nombreReferencia ?? "Familia"}:
                    </span>{" "}
                    {n.nota}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ResumenBloque>
      )}

      {/* 5. Informe de evaluación al Comité */}
      {sc && (
        <ResumenBloque icon={BarChart3} titulo="5. Informe de evaluación (Comité)">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={descargarInformePdf}
              disabled={descargando}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#009850] border border-[#009850]/40 rounded-lg px-3 py-1.5 hover:bg-[#009850]/5 disabled:opacity-50"
            >
              {descargando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Descargar informe PDF
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField label="Motivo" value={str(sc.motivo, "—")} />
            <InfoField label="Dirigido a" value={str(sc.dirigidoA, "—")} />
            <InfoField label="Nivel de urgencia" value={str(sc.nivelUrgencia, "—")} />
            <InfoField label="Tipo de intervención" value={str(sc.tipoIntervencion, "—")} />
          </div>
          {str(sc.objetivoGeneral) && (
            <InfoField label="Objetivo general" value={str(sc.objetivoGeneral)} />
          )}
          {str(sc.analisisSituacion) && (
            <InfoField label="Análisis de la situación" value={str(sc.analisisSituacion)} />
          )}
          {str(sc.hallazgosTexto) && <InfoField label="Hallazgos" value={str(sc.hallazgosTexto)} />}
          {str(sc.conclusiones) && <InfoField label="Conclusiones" value={str(sc.conclusiones)} />}

          {familiasEval.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
                Kits asignados por familia
              </p>
              <div className="space-y-2">
                {familiasEval.map((f) => (
                  <div key={f.refId} className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-gray-800 mb-1">{f.nombre}</p>
                    {f.kits.map((k, ki) => (
                      <div key={ki} className="mb-1">
                        <p className="text-[11px] font-semibold text-[#009850]">{k.tipoKit}</p>
                        <ul className="ml-2">
                          {k.articulos.map((a, ai) => (
                            <li key={ai} className="text-[11px] text-gray-600">
                              {a.descripcion} <span className="text-gray-400">({a.codigo})</span> ×
                              {a.cantidad}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ResumenBloque>
      )}

      {/* 6. Decisión del Comité */}
      {data.solicitudComite && (
        <ResumenBloque icon={CheckCircle} titulo="6. Decisión del Comité de Donaciones">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField
              label="Resultado"
              value={data.solicitudComite.resultado ?? data.solicitudComite.estado ?? "—"}
            />
            {data.solicitudComite.fecha && (
              <InfoField label="Fecha de decisión" value={fmtDate(data.solicitudComite.fecha)} />
            )}
          </div>
          {data.solicitudComite.observaciones && (
            <InfoField label="Resolución / observaciones" value={data.solicitudComite.observaciones} />
          )}
        </ResumenBloque>
      )}

      {/* 7. Entrega de ayuda */}
      {data.entregas.length > 0 && (
        <ResumenBloque
          icon={Package}
          titulo="7. Entrega de ayuda humanitaria"
          contador={`${data.entregas.length} entrega(s)`}
        >
          {data.entregas.map((e) => (
            <div key={e.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{e.tipoAyuda ?? "—"}</span>
                <span className="text-xs text-gray-400">{e.fecha ? fmtDate(e.fecha) : "—"}</span>
              </div>
              {e.descripcionAyuda && (
                <p className="text-xs text-gray-700 whitespace-pre-line">{e.descripcionAyuda}</p>
              )}
              {e.lugarEntrega && <p className="text-[11px] text-gray-500">Lugar: {e.lugarEntrega}</p>}
              {e.observaciones && <p className="text-[11px] text-gray-500">{e.observaciones}</p>}
            </div>
          ))}
        </ResumenBloque>
      )}

      {/* 8. Seguimiento */}
      {data.seguimientos.length > 0 && (
        <ResumenBloque
          icon={ShieldCheck}
          titulo="8. Seguimiento post-atención"
          contador={`${data.seguimientos.length} registro(s)`}
        >
          {data.seguimientos.map((s) => (
            <div key={s.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{s.situacion ?? "—"}</span>
                <span className="text-xs text-gray-400">{fmtDate(s.fecha)}</span>
              </div>
              {s.descripcion && (
                <p className="text-xs text-gray-700 whitespace-pre-line">{s.descripcion}</p>
              )}
              {s.recomendaciones && (
                <p className="text-[11px] text-gray-500">Recomendación: {s.recomendaciones}</p>
              )}
              {s.necesidadesPendientes && (
                <p className="text-[11px] text-amber-700">Necesidades: {s.necesidadesPendientes}</p>
              )}
            </div>
          ))}
        </ResumenBloque>
      )}

      {/* 9. Documentos y evidencias */}
      <ResumenBloque
        icon={FileText}
        titulo="9. Documentos y evidencias"
        contador={`${data.evidencias.length} archivo(s)`}
      >
        <EvidenciasRegistro evidencias={data.evidencias} />
      </ResumenBloque>

      {/* 10. Historial de estados */}
      {data.historial.length > 0 && (
        <ResumenBloque icon={Clock} titulo="10. Historial de estados">
          <div className="space-y-1.5">
            {data.historial.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-600">
                <span className="text-gray-400 shrink-0">{fmtDateTime(h.fecha)}</span>
                <span className="font-medium">{h.estadoNuevo}</span>
                {h.motivoCambio && <span className="text-gray-400">— {h.motivoCambio}</span>}
              </div>
            ))}
          </div>
        </ResumenBloque>
      )}

      {/* 11. Notificaciones enviadas */}
      <NotificacionesHistorial incidenciaId={data.idIncidencia} />
    </div>
  );
}
