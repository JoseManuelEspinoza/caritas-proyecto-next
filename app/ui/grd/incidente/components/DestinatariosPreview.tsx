"use client";

import { useEffect, useState } from "react";
import { Info, ChevronDown, ChevronUp, Users } from "lucide-react";
import { getDestinatariosNotificacion } from "@/app/actions/incidents";
import type { DestinatarioNotif } from "@/app/actions/incidents";

const ROL_LABEL: Record<string, string> = {
  COMITEDONACIONES: "Comité de Donaciones",
  JEFAOGP: "Jefa OGP",
  ESPECIALISTAGRD: "Especialista GRD",
  ADMINISTRADOR: "Administrador",
};

interface Props {
  step: "informe" | "decision";
  incidenciaId: string;
}

export function DestinatariosPreview({ step, incidenciaId }: Props) {
  const [destinatarios, setDestinatarios] = useState<DestinatarioNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDestinatariosNotificacion(step, incidenciaId)
      .then(setDestinatarios)
      .catch(() => setDestinatarios([]))
      .finally(() => setLoading(false));
  }, [step, incidenciaId]);

  if (loading) return null;

  if (destinatarios.length === 0) {
    return (
      <p className="text-xs text-amber-600 flex items-center gap-1">
        <Info className="w-3 h-3 shrink-0" />
        No hay destinatarios configurados para este paso.
      </p>
    );
  }

  const n = destinatarios.length;
  return (
    <div className="text-xs text-gray-500">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        <Users className="w-3 h-3 shrink-0" />
        <span>
          {n} {n === 1 ? "persona recibirá" : "personas recibirán"} esta notificación
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <ul className="mt-1.5 pl-4 space-y-0.5">
          {destinatarios.map((d) => (
            <li key={d.email} className="flex items-center gap-1.5">
              <span className="font-medium text-gray-700">{d.nombre}</span>
              <span className="text-gray-400">—</span>
              <span>{ROL_LABEL[d.rol] ?? d.rol}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
