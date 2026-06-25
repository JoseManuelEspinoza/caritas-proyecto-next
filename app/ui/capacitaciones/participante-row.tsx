"use client";

import type { ParticipanteCurso } from "@/app/actions/capacitaciones";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ParticipanteRow({
  p,
}: {
  p: ParticipanteCurso;
  onRefresh: () => Promise<void>;
}) {
  const notaInicialStr = p.notaInicial != null ? `${p.notaInicial}/20` : "—";
  const notaFinalStr = p.nota != null ? `${p.nota}/20` : "—";

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      {/* Participante */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={p.nombre} />
          <div className="min-w-0">
            <p className="font-medium text-[var(--caritas-text)] text-sm leading-tight">
              {p.nombre}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {[p.documento, `Inscrito ${fmtShort(p.fechaInscripcion)}`].filter(Boolean).join("  ·  ")}
            </p>
            <p className="text-xs text-gray-400 truncate">
              Inicial: {notaInicialStr}  ·  Final: {notaFinalStr}
            </p>
          </div>
        </div>
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        {p.certificado ? (
          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Certificado
          </span>
        ) : p.resultado === "APROBADO" ? (
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Aprobado
          </span>
        ) : p.resultado === "DESAPROBADO" ? (
          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Desaprobado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Sin evaluar
          </span>
        )}
      </td>

      {/* Último acceso */}
      <td className="px-4 py-3">
        {p.ultimaActividad ? (
          <span className="text-xs text-gray-500">{fmtShort(p.ultimaActividad)}</span>
        ) : (
          <span className="text-xs text-gray-300">Sin actividad</span>
        )}
      </td>
    </tr>
  );
}
