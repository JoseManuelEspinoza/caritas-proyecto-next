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
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { inscribirme } from "@/app/actions/capacitaciones";
import type { CursoInscrito, CursoDisponible } from "@/app/actions/capacitaciones";
import { RendirExamenModal } from "@/app/ui/capacitaciones/rendir-examen-modal";
import { ConstanciaModal } from "@/app/ui/capacitaciones/ConstanciaModal";
import { SeccionAcordeon } from "@/app/ui/capacitaciones/seccion-acordeon";

function fmtNota(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
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

function getMaterialIcon(tipo: string | null) {
  if (tipo === "Video") return <PlayCircle className="w-4 h-4 text-[var(--caritas-green)]" />;
  if (tipo === "Enlace web") return <ExternalLink className="w-4 h-4 text-[var(--caritas-green)]" />;
  return <FileText className="w-4 h-4 text-[var(--caritas-green)]" />;
}

function getMaterialBtn(tipo: string | null): { icon: React.ReactNode; label: string } {
  if (tipo === "Video") return { icon: <PlayCircle className="w-3 h-3" />, label: "Ver video" };
  if (tipo === "Enlace web") return { icon: <ExternalLink className="w-3 h-3" />, label: "Abrir enlace" };
  return { icon: <FileText className="w-3 h-3" />, label: "Abrir" };
}

function UnidadLectura({ sesion }: { sesion: CursoInscrito["sesiones"][number] }) {
  const [expandida, setExpandida] = useState(true);
  return (
    <div className="border border-[var(--caritas-border)] rounded-lg">
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full flex items-start gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-l-4 border-[var(--caritas-green)] rounded-t-lg cursor-pointer"
      >
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-0.5 ${expandida ? "" : "-rotate-90"}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[var(--caritas-text)] block">{sesion.tituloUnidad}</span>
          {sesion.descripcion && (
            <span className="text-xs text-gray-500 mt-0.5 block line-clamp-2">{sesion.descripcion}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-white border border-[var(--caritas-border)] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
          {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
        </span>
      </button>
      {expandida && (
        <div className="divide-y divide-gray-100 bg-white">
          {sesion.materiales.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-4 pl-10 italic">Sin materiales en esta unidad.</p>
          ) : (
            sesion.materiales.map((m) => {
              const { icon, label } = getMaterialBtn(m.tipoMaterial);
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 pl-10 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[var(--caritas-green)]/8 flex items-center justify-center shrink-0">
                    {getMaterialIcon(m.tipoMaterial)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.titulo}</p>
                    {m.tipoMaterial && <p className="text-[11px] text-gray-400 mt-0.5">{m.tipoMaterial}</p>}
                  </div>
                  {m.enlaceMaterial && (
                    <a
                      href={m.enlaceMaterial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 rounded-lg hover:bg-[var(--caritas-green)]/5 transition-colors shrink-0"
                    >
                      {icon} {label}
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function DetalleInscrito({ curso, onVolver }: { curso: CursoInscrito; onVolver: () => void }) {
  const [showExamen, setShowExamen] = useState(false);
  const [showExamenInicial, setShowExamenInicial] = useState(false);
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

        {/* Nota de certificación */}
        {(curso.cuestionarioInicial || curso.cuestionarioFinal) && !curso.certificado && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <ClipboardList className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-600">
              Para certificarte debes aprobar{" "}
              {curso.cuestionarioInicial && curso.cuestionarioFinal
                ? "el examen inicial y el examen final"
                : curso.cuestionarioInicial
                ? "el examen inicial"
                : "el examen final"}.
            </p>
          </div>
        )}

        {/* Evaluación inicial */}
        {curso.cuestionarioInicial && (
          <SeccionAcordeon titulo="Evaluación inicial">
            <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--caritas-text)]">{curso.cuestionarioInicial.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {curso.cuestionarioInicial.totalPreguntas} preguntas
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${curso.cuestionarioInicial.intentosUsados >= curso.cuestionarioInicial.maxIntentos ? "text-red-500" : "text-amber-600"}`}>
                    {curso.cuestionarioInicial.maxIntentos - curso.cuestionarioInicial.intentosUsados} intento(s) restante(s) de {curso.cuestionarioInicial.maxIntentos}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExamenInicial(true)}
                disabled={curso.cuestionarioInicial.intentosUsados >= curso.cuestionarioInicial.maxIntentos}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-amber-500 text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0 font-medium"
              >
                <PlayCircle className="w-4 h-4" />
                {curso.cuestionarioInicial.intentosUsados > 0 ? "Reintentar" : "Rendir examen"}
              </button>
            </div>
          </SeccionAcordeon>
        )}

        {/* Contenido del curso */}
        <SeccionAcordeon titulo="Contenido del curso" badge={curso.sesiones.length}>
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
        </SeccionAcordeon>

        {/* Evaluación final — se desbloquea solo si rindió al menos 1 vez el examen inicial */}
        {curso.cuestionarioFinal && (() => {
          const inicialRendido = !curso.cuestionarioInicial || curso.cuestionarioInicial.intentosUsados > 0;
          const sinIntentos = curso.cuestionarioFinal.intentosUsados >= curso.cuestionarioFinal.maxIntentos;
          return (
            <SeccionAcordeon titulo="Evaluación final">
              {!inicialRendido ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-700 font-medium">
                    Debes rendir el examen inicial primero.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--caritas-green)]/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--caritas-text)]">{curso.cuestionarioFinal.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {curso.cuestionarioFinal.totalPreguntas} preguntas
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${sinIntentos ? "text-red-500" : "text-[var(--caritas-green)]"}`}>
                        {curso.cuestionarioFinal.maxIntentos - curso.cuestionarioFinal.intentosUsados} intento(s) restante(s) de {curso.cuestionarioFinal.maxIntentos}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExamen(true)}
                    disabled={sinIntentos}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-[var(--caritas-green)] text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0 font-medium"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {curso.cuestionarioFinal.intentosUsados > 0 ? "Reintentar" : "Rendir examen"}
                  </button>
                </div>
              )}
            </SeccionAcordeon>
          );
        })()}

        {/* Constancia — solo si rindió el examen final al menos 1 vez */}
        {curso.certificado && curso.cuestionarioFinal && curso.cuestionarioFinal.intentosUsados > 0 && (
          <SeccionAcordeon titulo="Constancia de certificación">
            <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${curso.constanciaUrl ? "bg-green-50 border-green-200" : "bg-gray-50 border-[var(--caritas-border)]"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">¡Evaluación final rendida!</p>
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
          </SeccionAcordeon>
        )}
      </div>

      {showExamenInicial && curso.cuestionarioInicial && (
        <RendirExamenModal
          idInscripcion={curso.idInscripcion}
          cuestionario={curso.cuestionarioInicial}
          onClose={() => setShowExamenInicial(false)}
        />
      )}
      {showExamen && curso.cuestionarioFinal && (
        <RendirExamenModal
          idInscripcion={curso.idInscripcion}
          cuestionario={curso.cuestionarioFinal}
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
  const [constanciaAbierta, setConstanciaAbierta] = useState<string | null>(null);

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
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <DetalleInscrito curso={detalleCurso} onVolver={() => setDetalleId(null)} />
      </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
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
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetalleId(c.id)}
                    className="text-left p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <EstadoBadge resultado={c.resultado} certificado={c.certificado} />
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--caritas-green)] transition-colors shrink-0 ml-auto" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--caritas-text)] leading-snug mb-1.5">{c.nombreCurso}</h3>
                    {c.descripcion && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.descripcion}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.sesiones.length} unidades</span>
                      {c.fechaPublicacion && <span>{fmtDate(c.fechaPublicacion)}</span>}
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
          {constancias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl py-16 text-gray-400">
              <ScrollText className="w-10 h-10" />
              <p className="text-sm font-medium">Aún no tienes constancias disponibles</p>
              <p className="text-xs text-center max-w-xs">Aparecerán aquí cuando apruebes un curso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {constancias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConstanciaAbierta(c.idInscripcion)}
                  className="group text-left bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden hover:shadow-lg hover:border-[var(--caritas-green)]/40 transition-all"
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
                      <Eye className="w-3.5 h-3.5" /> Ver constancia
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cursos Disponibles */}
      {tab === "disponibles" && (
        <div className="space-y-4">
          {disponiblesCursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl py-16 text-gray-400">
              <GraduationCap className="w-10 h-10" />
              <p className="text-sm">No hay cursos disponibles por el momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disponiblesCursos.map((c) => (
                <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                      PUBLICADO
                    </span>
                    {c.codigoCurso && (
                      <span className="text-[11px] font-mono text-gray-400">{c.codigoCurso}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--caritas-text)] leading-snug mb-1.5">{c.nombreCurso}</h3>
                  {c.descripcion && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.descripcion}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalInscritos} inscritos</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.totalSesiones} unidades</span>
                    {c.duracionEstimadaHoras && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duracionEstimadaHoras}h estimadas</span>
                    )}
                    {c.fechaPublicacion && <span>{fmtDate(c.fechaPublicacion)}</span>}
                  </div>
                  <button
                    onClick={() => handleInscribirse(c.id)}
                    disabled={pending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-[var(--caritas-green)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4" /> Inscribirme
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {constanciaAbierta && (
      <ConstanciaModal
        idInscripcion={constanciaAbierta}
        onClose={() => setConstanciaAbierta(null)}
      />
    )}
    </>
  );
}
