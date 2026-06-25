"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { ResumenBloque } from "@/app/ui/grd/incidente/components/ResumenBloque";

const TIPO_LABEL: Record<string, string> = {
  INCIDENCIA_NUEVA: "Nueva incidencia registrada",
  RESPONSABLE_ASIGNADO: "Responsable de equipo asignado",
  BRIGADISTA_ASIGNADO: "Brigadistas asignados",
  INFORME_ENVIADO_COMITE: "Informe enviado al Comité",
  DECISION_APROBADO: "Decisión del Comité: Aprobado",
  DECISION_OBSERVADO: "Decisión del Comité: Observado",
  DECISION_RECHAZADO: "Decisión del Comité: Rechazado",
};

type Destinatario = { nombre: string; email: string; rol: string };

type Group = {
  tipo: string;
  titulo: string;
  enviadoAt: string;
  destinatarios: Destinatario[];
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  incidenciaId: string;
}

export function NotificacionesHistorial({ incidenciaId }: Props) {
  const [grupos, setGrupos] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notificaciones/incidencia/${incidenciaId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setGrupos)
      .catch(() => setGrupos([]))
      .finally(() => setLoading(false));
  }, [incidenciaId]);

  if (loading || grupos.length === 0) return null;

  return (
    <ResumenBloque icon={Bell} titulo="11. Notificaciones enviadas">
      <div className="space-y-3">
        {grupos.map((g) => (
          <div key={g.tipo} className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">
                {TIPO_LABEL[g.tipo] ?? g.titulo}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400 shrink-0">{fmtDateTime(g.enviadoAt)}</span>
            </div>
            <ul className="pl-3 space-y-0.5">
              {g.destinatarios.map((d) => (
                <li key={d.email} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="text-gray-300">└</span>
                  <span>{d.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ResumenBloque>
  );
}
