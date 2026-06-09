"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Users,
  Link as LinkIcon,
  ClipboardList,
  PlayCircle,
  ChevronDown,
  Download,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { inscribirme } from "@/app/actions/capacitaciones";
import type { CursoInscrito, CursoDisponible } from "@/app/actions/capacitaciones";
import { RendirExamenModal } from "@/app/ui/capacitaciones/rendir-examen-modal";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function EstadoBadge({ resultado, certificado }: { resultado: string | null; certificado: boolean }) {
  if (certificado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-green-600 px-2 py-0.5 rounded-full">
        <Award className="w-3 h-3" /> Certificado
      </span>
    );
  }
  if (resultado === "APROBADO") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Aprobado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> En curso
    </span>
  );
}

function UnidadLectura({ sesion }: { sesion: CursoInscrito["sesiones"][number] }) {
  const [expandida, setExpandida] = useState(true);
  return (
    <div className="border border-[var(--caritas-border)] rounded-lg">
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-l-4 border-[var(--caritas-green)] rounded-t-lg"
      >
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandida ? "" : "-rotate-90"}`} />
        <span className="text-sm font-semibold text-[var(--caritas-text)] flex-1">{sesion.tituloUnidad}</span>
        <span className="text-xs text-gray-400 bg-white border border-[var(--caritas-border)] px-2 py-0.5 rounded-full shrink-0">
          {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
        </span>
      </button>
      {expandida && (
        <div className="divide-y divide-gray-100">
          {sesion.materiales.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3 pl-11">Sin materiales en esta unidad.</p>
          ) : (
            sesion.materiales.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 pl-11 hover:bg-gray-50 transition-colors border-l-4 border-[var(--caritas-green)]/20">
                <FileText className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--caritas-text)] truncate">{m.titulo}</p>
                  {m.tipoMaterial && <p className="text-[11px] text-gray-400 mt-0.5">{m.tipoMaterial}</p>}
                </div>
                {m.enlaceMaterial && (
                  <a
                    href={m.enlaceMaterial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 rounded-lg hover:bg-[var(--caritas-green)]/5 transition-colors shrink-0 font-medium"
                  >
                    <LinkIcon className="w-3 h-3" /> Abrir
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DetalleInscrito({ curso, onVolver }: { curso: CursoInscrito; onVolver: () => void }) {
  const [showExamen, setShowExamen] = useState(false);
  const aprobado = curso.certificado || curso.resultado === "APROBADO";

  return (
    <>
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={onVolver}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--caritas-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Mis cursos
        </button>

        {/* Course header card */}
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
          <div className={`h-2 w-full ${aprobado ? "bg-green-500" : "bg-amber-400"}`} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 font-mono">{curso.codigoCurso}</span>
                  <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">Asincrónica</span>
                  <EstadoBadge resultado={curso.resultado} certificado={curso.certificado} />
                </div>
                <h2 className="text-xl font-bold text-[var(--caritas-text)]">{curso.nombreCurso}</h2>
                {curso.descripcion && (
                  <p className="text-sm text-gray-500 mt-1.5">{curso.descripcion}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{curso.sesiones.length} unidades</span>
                  {curso.fechaPublicacion && <span>Publicado {fmtDate(curso.fechaPublicacion)}</span>}
                </div>
              </div>
              {/* Notas */}
              <div className="flex gap-3 shrink-0">
                {curso.evalInicial != null && (
                  <div className="text-center bg-gray-50 rounded-xl p-3 min-w-[64px]">
                    <p className="text-lg font-bold text-[var(--caritas-text)]">{curso.evalInicial}<span className="text-xs text-gray-400">/20</span></p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Eval. inicial</p>
                  </div>
                )}
                {curso.evalFinal != null && (
                  <div className={`text-center rounded-xl p-3 min-w-[64px] ${aprobado ? "bg-green-50" : "bg-amber-50"}`}>
                    <p className={`text-lg font-bold ${aprobado ? "text-green-700" : "text-amber-700"}`}>{curso.evalFinal}<span className="text-xs opacity-60">/20</span></p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Eval. final</p>
                  </div>
                )}
                {curso.certificado && (
                  curso.constanciaUrl ? (
                    <a
                      href={curso.constanciaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-xl p-3 min-w-[72px] hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-5 h-5 text-green-600" />
                      <p className="text-[10px] text-green-700 font-semibold">Constancia</p>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 bg-green-50 rounded-xl p-3 min-w-[72px]">
                      <Award className="w-5 h-5 text-green-600" />
                      <p className="text-[10px] text-green-700 font-medium">Certificado</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Examen */}
        {curso.cuestionario && (
          <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--caritas-text)] mb-3">Evaluación final</h3>
            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--caritas-green)]/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--caritas-text)]">{curso.cuestionario.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {curso.cuestionario.totalPreguntas} preguntas · Nota mínima {curso.cuestionario.notaAprobatoria}/20
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${curso.cuestionario.intentosUsados >= curso.cuestionario.maxIntentos ? "text-red-500" : "text-[var(--caritas-green)]"}`}>
                    {curso.cuestionario.maxIntentos - curso.cuestionario.intentosUsados} intento(s) restante(s) de {curso.cuestionario.maxIntentos}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExamen(true)}
                disabled={curso.cuestionario.intentosUsados >= curso.cuestionario.maxIntentos}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-[var(--caritas-green)] text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0 font-medium"
              >
                <PlayCircle className="w-4 h-4" />
                {curso.cuestionario.intentosUsados > 0 ? "Reintentar" : "Rendir examen"}
              </button>
            </div>
          </div>
        )}

        {/* Constancia de certificación */}
        {curso.certificado && (
          <div className={`flex items-center justify-between gap-4 p-5 rounded-xl border ${curso.constanciaUrl ? "bg-green-50 border-green-200" : "bg-gray-50 border-[var(--caritas-border)]"}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">¡Curso completado!</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {curso.constanciaUrl ? "Tu constancia está lista para descargar." : "Tu constancia está siendo procesada por el especialista."}
                </p>
              </div>
            </div>
            {curso.constanciaUrl && (
              <a
                href={curso.constanciaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" /> Descargar constancia
              </a>
            )}
          </div>
        )}

        {/* Contenido del curso */}
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--caritas-text)] mb-3">Contenido del curso</h3>
          {curso.sesiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 text-gray-400">
              <BookOpen className="w-8 h-8" />
              <p className="text-sm">El contenido aún no está disponible.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {curso.sesiones.map((s) => (
                <UnidadLectura key={s.id} sesion={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showExamen && curso.cuestionario && (
        <RendirExamenModal
          idInscripcion={curso.idInscripcion}
          cuestionario={curso.cuestionario}
          onClose={() => setShowExamen(false)}
        />
      )}
    </>
  );
}

export function BrigadistaCapacitaciones({
  inscritosCursos,
  disponiblesCursos,
}: {
  inscritosCursos: CursoInscrito[];
  disponiblesCursos: CursoDisponible[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"mis-cursos" | "disponibles" | "constancias">("mis-cursos");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "en-curso" | "aprobados">("todos");

  const detalleCurso = inscritosCursos.find((c) => c.id === detalleId) ?? null;

  const cursosFiltrados = inscritosCursos.filter((c) => {
    if (filtro === "en-curso") return !c.certificado;
    if (filtro === "aprobados") return c.certificado;
    return true;
  });

  const conteos = {
    todos: inscritosCursos.length,
    "en-curso": inscritosCursos.filter((c) => !c.certificado).length,
    aprobados: inscritosCursos.filter((c) => c.certificado).length,
  };

  const constancias = inscritosCursos.filter((c) => c.certificado && c.constanciaUrl);

  const handleInscribirse = (idCurso: string) =>
    startTransition(async () => {
      const res = await inscribirme(idCurso);
      if (res && "message" in res && res.message) {
        toast.error(res.message);
      } else {
        toast.success("¡Te inscribiste exitosamente!");
        router.refresh();
      }
    });

  if (detalleCurso) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <DetalleInscrito curso={detalleCurso} onVolver={() => setDetalleId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--caritas-text)]">Formación y Certificación</h1>
          <p className="text-sm text-gray-500">Tus capacitaciones como brigadista</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("mis-cursos")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "mis-cursos"
              ? "bg-white text-[var(--caritas-text)] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Mis Cursos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "mis-cursos" ? "bg-[var(--caritas-green)]/10 text-[var(--caritas-green)]" : "bg-gray-200 text-gray-500"}`}>
            {inscritosCursos.length}
          </span>
        </button>
        <button
          onClick={() => setTab("disponibles")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "disponibles"
              ? "bg-white text-[var(--caritas-text)] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Disponibles
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "disponibles" ? "bg-[var(--caritas-green)]/10 text-[var(--caritas-green)]" : "bg-gray-200 text-gray-500"}`}>
            {disponiblesCursos.length}
          </span>
        </button>
        <button
          onClick={() => setTab("constancias")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "constancias"
              ? "bg-white text-[var(--caritas-text)] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Constancias
          {constancias.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "constancias" ? "bg-[var(--caritas-green)]/10 text-[var(--caritas-green)]" : "bg-gray-200 text-gray-500"}`}>
              {constancias.length}
            </span>
          )}
        </button>
      </div>

      {/* Mis Cursos */}
      {tab === "mis-cursos" && (
        <div className="space-y-4">
          {/* Filtros */}
          {inscritosCursos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(["todos", "en-curso", "aprobados"] as const).map((f) => {
                const labels = { todos: "Todos", "en-curso": "En curso", aprobados: "Aprobados" };
                const colors = {
                  todos: "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  "en-curso": "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200",
                  aprobados: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200",
                };
                const activeColors = {
                  todos: "bg-gray-700 text-white",
                  "en-curso": "bg-amber-500 text-white border-transparent",
                  aprobados: "bg-green-600 text-white border-transparent",
                };
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtro === f ? activeColors[f] : colors[f]}`}
                  >
                    {labels[f]}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filtro === f ? "bg-white/20" : "bg-black/10"}`}>
                      {conteos[f]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {inscritosCursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl py-16 text-gray-400">
              <BookOpen className="w-10 h-10" />
              <p className="text-sm font-medium">Aún no estás inscrito en ningún curso</p>
              <button onClick={() => setTab("disponibles")} className="text-sm text-[var(--caritas-green)] hover:underline font-medium">
                Ver cursos disponibles →
              </button>
            </div>
          ) : cursosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 bg-white border border-[var(--caritas-border)] rounded-xl py-12 text-gray-400">
              <BookOpen className="w-8 h-8" />
              <p className="text-sm">No tienes cursos en este estado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cursosFiltrados.map((c) => {
                const aprobado = c.certificado || c.resultado === "APROBADO";
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetalleId(c.id)}
                    className="text-left bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden hover:shadow-md hover:border-[var(--caritas-green)]/50 transition-all group"
                  >
                    {/* Banda de color superior */}
                    <div className={`h-1.5 w-full ${aprobado ? "bg-green-500" : "bg-amber-400"}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <EstadoBadge resultado={c.resultado} certificado={c.certificado} />
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--caritas-green)] transition-colors shrink-0 mt-0.5" />
                      </div>
                      <h3 className="text-sm font-bold text-[var(--caritas-text)] leading-snug mb-1">{c.nombreCurso}</h3>
                      {c.descripcion && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.descripcion}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.sesiones.length} unidades</span>
                          {c.fechaPublicacion && <span>{fmtDate(c.fechaPublicacion)}</span>}
                        </div>
                        <span className="text-xs text-[var(--caritas-green)] font-medium group-hover:underline">
                          {aprobado ? "Ver curso" : "Continuar →"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Constancias */}
      {tab === "constancias" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Tus constancias de capacitación.</p>
          {constancias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl py-16 text-gray-400">
              <ScrollText className="w-10 h-10" />
              <p className="text-sm font-medium">Aún no tienes constancias disponibles</p>
              <p className="text-xs text-center max-w-xs">Aparecerán aquí cuando apruebes un curso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {constancias.map((c) => (
                <a
                  key={c.id}
                  href={c.constanciaUrl!}
                  className="group block bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden hover:shadow-lg hover:border-[var(--caritas-green)]/40 transition-all"
                >
                  {/* Previsualización mini del certificado */}
                  <div className="bg-gray-50 border-b border-[var(--caritas-border)] p-4 aspect-[4/3] flex flex-col">
                    {/* Header verde mini */}
                    <div className="bg-[var(--caritas-green)] rounded-t-lg px-3 py-2 text-center mb-2">
                      <p className="text-white text-[9px] font-semibold uppercase tracking-widest leading-tight">Cáritas del Perú</p>
                      <p className="text-white/90 text-[8px] leading-tight">Constancia de Capacitación</p>
                    </div>
                    {/* Cuerpo mini */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center px-2">
                      <div className="w-8 h-0.5 bg-[var(--caritas-green)]/30 rounded" />
                      <p className="text-[9px] font-bold text-[var(--caritas-text)] leading-tight line-clamp-1">{c.nombreCurso}</p>
                      <div className="w-8 h-0.5 bg-[var(--caritas-green)]/30 rounded" />
                      <Award className="w-5 h-5 text-[var(--caritas-green)]/40 mt-1" />
                    </div>
                    {/* Pie mini con líneas de firma */}
                    <div className="flex justify-between px-3 mt-1">
                      <div className="w-10 border-b border-gray-300" />
                      <div className="w-10 border-b border-gray-300" />
                    </div>
                  </div>
                  {/* Info y botón */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-[var(--caritas-text)] leading-snug line-clamp-2 mb-0.5">{c.nombreCurso}</p>
                    <p className="text-xs text-gray-400 mb-3 font-mono">{c.codigoCurso}</p>
                    <div className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 rounded-lg group-hover:bg-[var(--caritas-green)]/5 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Ver constancia
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cursos Disponibles */}
      {tab === "disponibles" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Cursos publicados en los que puedes inscribirte. El especialista GRD confirmará tu registro.
          </p>
          {disponiblesCursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl py-16 text-gray-400">
              <GraduationCap className="w-10 h-10" />
              <p className="text-sm">No hay cursos disponibles por el momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disponiblesCursos.map((c) => (
                <div key={c.id} className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
                  <div className="h-1.5 w-full bg-[var(--caritas-green)]" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-400 font-mono">{c.codigoCurso}</span>
                        <h3 className="text-sm font-bold text-[var(--caritas-text)] mt-0.5 mb-1">{c.nombreCurso}</h3>
                        {c.descripcion && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.descripcion}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalInscritos} inscritos</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.totalSesiones} unidades</span>
                          {c.fechaPublicacion && <span>{fmtDate(c.fechaPublicacion)}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInscribirse(c.id)}
                      disabled={pending}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-[var(--caritas-green)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <GraduationCap className="w-4 h-4" /> Inscribirme
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
