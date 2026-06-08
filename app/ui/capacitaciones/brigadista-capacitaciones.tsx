"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Download,
  Award,
  CheckCircle,
  Clock,
  ChevronRight,
  FileText,
  Users,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { inscribirme } from "@/app/actions/capacitaciones";
import type { CursoInscrito, CursoDisponible } from "@/app/actions/capacitaciones";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function EstadoBadge({ resultado, certificado }: { resultado: string | null; certificado: boolean }) {
  if (certificado || resultado === "APROBADO") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
        <CheckCircle className="w-3.5 h-3.5" /> Aprobado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
      <Clock className="w-3.5 h-3.5" /> Pendiente
    </span>
  );
}

function DetalleInscrito({
  curso,
  onVolver,
}: {
  curso: CursoInscrito;
  onVolver: () => void;
}) {
  return (
    <div>
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--caritas-text)] mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a mis cursos
      </button>

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">{curso.codigoCurso}</span>
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
              Asincrónica
            </span>
            <span className="text-xs font-medium text-green-700">
              {curso.certificado || curso.resultado === "APROBADO" ? "✓ Aprobado" : "En curso"}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--caritas-text)]">{curso.nombreCurso}</h2>
          {curso.descripcion && (
            <p className="text-sm text-gray-600 mt-1">{curso.descripcion}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmtDate(curso.fechaPublicacion)}{curso.fechaCierre ? ` — ${fmtDate(curso.fechaCierre)}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Resp. {curso.responsable}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Eval. Inicial</p>
            <p className="text-lg font-bold text-[var(--caritas-text)]">
              {curso.evalInicial != null ? `${curso.evalInicial}/20` : "—"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Eval. Final</p>
            <p className="text-lg font-bold text-[var(--caritas-text)]">
              {curso.evalFinal != null ? `${curso.evalFinal}/20` : "—"}
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center ${curso.certificado ? "bg-green-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-500 mb-0.5">Certificación</p>
            <p className={`text-sm font-semibold flex items-center justify-center gap-1 ${curso.certificado ? "text-green-700" : "text-gray-400"}`}>
              {curso.certificado ? (
                <><Award className="w-4 h-4" /> Obtenida</>
              ) : (
                "Pendiente"
              )}
            </p>
          </div>
        </div>

        {/* Materials by session */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--caritas-text)] mb-3">
            Materiales del curso
          </h3>
          {curso.sesiones.length === 0 ? (
            <p className="text-sm text-gray-400">No hay materiales disponibles aún.</p>
          ) : (
            <div className="space-y-4">
              {curso.sesiones.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 bg-[var(--caritas-green)] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                      {s.numeroOrden}
                    </span>
                    <span className="text-sm font-medium text-[var(--caritas-text)]">
                      {s.tituloUnidad}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(curso.fechaPublicacion)}</span>
                  </div>
                  {s.materiales.length === 0 ? (
                    <p className="text-xs text-gray-400 ml-7">Sin materiales en esta sesión.</p>
                  ) : (
                    <ul className="ml-7 space-y-1.5">
                      {s.materiales.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 p-2 border border-[var(--caritas-border)] rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-[var(--caritas-green)] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[var(--caritas-text)] truncate">
                                {m.titulo}
                              </p>
                              {m.enlaceMaterial && (
                                <p className="text-[10px] text-gray-400 truncate">{m.enlaceMaterial}</p>
                              )}
                            </div>
                          </div>
                          {m.enlaceMaterial && (
                            <a
                              href={m.enlaceMaterial}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[var(--caritas-green)] font-medium shrink-0 hover:underline"
                            >
                              <Download className="w-3 h-3" /> Descargar
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [tab, setTab] = useState<"mis-cursos" | "disponibles">("mis-cursos");
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const detalleCurso = inscritosCursos.find((c) => c.id === detalleId) ?? null;

  const aprobados = inscritosCursos.filter(
    (c) => c.certificado || c.resultado === "APROBADO"
  ).length;
  const enCurso = inscritosCursos.filter(
    (c) => !c.certificado && c.resultado !== "APROBADO"
  ).length;

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
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <DetalleInscrito curso={detalleCurso} onVolver={() => setDetalleId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)] font-semibold text-lg">
            Formación y Certificación
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-[var(--caritas-border)] rounded-xl overflow-hidden mb-5">
        <button
          onClick={() => setTab("mis-cursos")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "mis-cursos"
              ? "bg-[var(--caritas-green)] text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Mis Cursos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "mis-cursos" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
            {inscritosCursos.length}
          </span>
        </button>
        <button
          onClick={() => setTab("disponibles")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "disponibles"
              ? "bg-[var(--caritas-green)] text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Cursos Disponibles
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "disponibles" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
            {disponiblesCursos.length}
          </span>
        </button>
      </div>

      {/* Mis Cursos */}
      {tab === "mis-cursos" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--caritas-text)]">{inscritosCursos.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Inscritos</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{aprobados}</p>
              <p className="text-xs text-gray-500 mt-0.5">Aprobados</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{enCurso}</p>
              <p className="text-xs text-gray-500 mt-0.5">En curso</p>
            </div>
          </div>

          {inscritosCursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3 bg-white border border-[var(--caritas-border)] rounded-xl">
              <BookOpen className="w-10 h-10" />
              <p className="text-sm">No estás inscrito en ningún curso aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inscritosCursos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDetalleId(c.id)}
                  className="w-full text-left bg-white border border-[var(--caritas-border)] rounded-xl p-4 hover:shadow-sm hover:border-[var(--caritas-green)]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{c.codigoCurso}</span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">
                          Asincrónica
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--caritas-text)]">{c.nombreCurso}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(c.fechaPublicacion)}{c.fechaCierre ? ` — ${fmtDate(c.fechaCierre)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <EstadoBadge resultado={c.resultado} certificado={c.certificado} />
                      <ChevronRight className="w-4 h-4 text-gray-300" />
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
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Cursos activos en los que puedes inscribirte. Una vez inscrito, el especialista GRD
            gestionará tu registro.
          </p>
          {disponiblesCursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3 bg-white border border-[var(--caritas-border)] rounded-xl">
              <GraduationCap className="w-10 h-10" />
              <p className="text-sm">No hay cursos disponibles por el momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disponiblesCursos.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-[var(--caritas-border)] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{c.codigoCurso}</span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">
                          Asincrónica
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--caritas-text)]">
                        {c.nombreCurso}
                      </p>
                      {c.descripcion && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.descripcion}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(c.fechaPublicacion)}{c.fechaCierre ? ` — ${fmtDate(c.fechaCierre)}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {c.totalInscritos} inscritos
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {c.totalSesiones} sesiones
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Responsable: {c.responsable}
                      </p>
                    </div>
                    <button
                      onClick={() => handleInscribirse(c.id)}
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      <Users className="w-3.5 h-3.5" /> Inscribirme
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
