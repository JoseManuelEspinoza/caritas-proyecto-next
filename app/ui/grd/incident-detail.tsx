"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { IncidenciaDetalleOutput as IncidentData } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { fmtDate, fmtDateTime } from "@/app/ui/grd/incidente/lib/format";
import { estadoUI, iconoCategoria } from "@/app/ui/grd/incidente/config/estado-ui";
import { PASOS, indicePaso } from "@/app/ui/grd/incidente/config/pasos.config";
import { RegistroStep } from "@/app/ui/grd/incidente/steps/RegistroStep";
import { AsignacionStep } from "@/app/ui/grd/incidente/steps/AsignacionStep";
import { CampoStep } from "@/app/ui/grd/incidente/steps/CampoStep";
import { RevisionStep } from "@/app/ui/grd/incidente/steps/RevisionStep";
import { AtencionStep } from "@/app/ui/grd/incidente/steps/AtencionStep";
import { SeguimientoStep } from "@/app/ui/grd/incidente/steps/SeguimientoStep";
import { ResumenStep } from "@/app/ui/grd/incidente/steps/ResumenStep";

/**
 * Shell del detalle de incidencia: cabecera, barra de pasos del flujo y despacho
 * del paso activo. Cada paso vive en `@/app/ui/grd/incidente/steps/`. El flujo
 * (etapas/estados) viene del dominio vía `pasos.config`.
 */
export function IncidentDetail({ data }: { data: IncidentData }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(() => indicePaso(data.estadoActual));
  const [showHistory, setShowHistory] = useState(false);

  const cfg = estadoUI(data.estadoActual);
  const currentStepIdx = indicePaso(data.estadoActual);

  function handleDone() {
    router.refresh();
  }

  const CatIcon = iconoCategoria(data.tipoEvento);
  const canEdit =
    (data.role === "admin" || data.role === "especialistaGRD") && data.estadoActual === "ABIERTO";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/grd"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm text-gray-500">{data.codigoCaso ?? "—"}</span>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
            {data.tituloIncidencia ?? "Sin título"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            {data.tipoEvento && (
              <span className="flex items-center gap-1">
                <CatIcon className="w-4 h-4" />
                {data.tipoEvento}
              </span>
            )}
            {data.direccionEvento && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {data.direccionEvento}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {fmtDate(data.fechaRegistro)}
            </span>
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/grd/${data.idIncidencia}/editar`}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
        )}
      </div>

      {/* Pasos del flujo */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {/* Barra de pasos */}
        <div className="flex border-b border-[#DDDDDD] overflow-x-auto">
          {PASOS.map((step, idx) => {
            const StepIcon = step.icon;
            const completed = idx < currentStepIdx;
            const current = idx === currentStepIdx;
            const active = idx === activeStep;
            const isNextStep = idx === currentStepIdx + 1;
            // ATENCION (idx=4) solo se habilita como "siguiente paso" si el comité aprobó
            const nextStepAllowed =
              isNextStep && (idx !== 4 || data.solicitudComite?.resultado === "APROBAR");
            return (
              <button
                key={step.etapa}
                onClick={() => setActiveStep(idx)}
                disabled={!current && !completed && !nextStepAllowed}
                className={`flex flex-col items-center gap-1 px-3 md:px-4 py-3 text-xs font-medium transition-colors border-b-2 flex-shrink-0 min-w-[70px] ${
                  active
                    ? "border-[#009850] text-[#009850] bg-[#009850]/5"
                    : completed
                      ? "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                      : current
                        ? "border-[#009850]/40 text-gray-700 hover:bg-gray-50"
                        : nextStepAllowed
                          ? "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          : "border-transparent text-gray-300 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    completed
                      ? "bg-[#009850] text-white"
                      : current
                        ? "bg-[#009850]/10 text-[#009850]"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="hidden sm:block leading-tight text-center">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido del paso activo */}
        <div className="p-4 md:p-6">
          {activeStep === 0 && <RegistroStep data={data} />}
          {activeStep === 1 && <AsignacionStep data={data} onDone={handleDone} />}
          {activeStep === 2 && <CampoStep data={data} onDone={handleDone} />}
          {activeStep === 3 && <RevisionStep data={data} onDone={handleDone} />}
          {activeStep === 4 && (
            <AtencionStep data={data} onDone={handleDone} onNavigate={setActiveStep} />
          )}
          {activeStep === 5 && (
            <SeguimientoStep data={data} onDone={handleDone} onNavigate={setActiveStep} />
          )}
          {activeStep === 6 && <ResumenStep data={data} />}
        </div>
      </div>

      {/* Historial de estados */}
      {data.historial.length > 0 && (
        <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Historial de cambios
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showHistory && (
            <div className="border-t border-[#DDDDDD] px-5 py-4 space-y-2">
              {data.historial.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${estadoUI(h.estadoNuevo).dot}`}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{estadoUI(h.estadoNuevo).label}</span>
                    {h.motivoCambio && <span className="text-gray-500"> — {h.motivoCambio}</span>}
                    {h.observaciones && (
                      <p className="text-gray-400 mt-0.5 italic">{h.observaciones}</p>
                    )}
                  </div>
                  <span className="text-gray-400 flex-shrink-0">{fmtDateTime(h.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
