"use client";

import { Fragment, useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import { ParticipanteRow } from "./participante-row";
import type { ParticipanteCurso } from "@/app/actions/capacitaciones";

const PER_PAGE = 10;

export function ParticipantesTable({
  participantes,
  onRefresh,
  loading,
  maxIntentosInicial,
  maxIntentosFinal,
}: {
  participantes: ParticipanteCurso[];
  onRefresh: () => Promise<void>;
  loading?: boolean;
  maxIntentosInicial?: number;
  maxIntentosFinal?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      participantes.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          (p.documento ?? "").toLowerCase().includes(query.toLowerCase())
      ),
    [participantes, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const aprobados = participantes.filter(
    (p) => p.resultado === "APROBADO" || p.certificado
  ).length;
  const desaprobados = participantes.filter(
    (p) => p.resultado === "DESAPROBADO"
  ).length;
  const sinEvaluar = participantes.filter(
    (p) => !p.resultado && !p.certificado
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400 gap-2">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-[var(--caritas-green)] rounded-full animate-spin" />
        Cargando participantes...
      </div>
    );
  }

  if (participantes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
        <Users className="w-8 h-8" />
        <p className="text-sm">Ningún participante inscrito aún.</p>
      </div>
    );
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1
  );

  return (
    <div className="space-y-3">
      {/* Stats + buscador */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {aprobados} aprobado{aprobados !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {desaprobados} desaprobado{desaprobados !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            {sinEvaluar} sin evaluar
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar participante..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-8 pr-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)] w-52 transition-shadow"
          />
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
          Sin resultados para &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--caritas-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--caritas-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Participante
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Último acceso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((p) => (
                <ParticipanteRow
                  key={p.idInscripcion}
                  p={p}
                  maxIntentosInicial={maxIntentosInicial}
                  maxIntentosFinal={maxIntentosFinal}
                  onRefresh={onRefresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            {filtered.length} participante{filtered.length !== 1 ? "s" : ""} · Página {page} de{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ←
            </button>
            {pageNumbers.map((n, i) => (
              <Fragment key={n}>
                {i > 0 && pageNumbers[i - 1] !== n - 1 && (
                  <span className="px-1 text-gray-300">…</span>
                )}
                <button
                  onClick={() => setPage(n)}
                  className={`px-2.5 py-1 border rounded-lg transition-colors cursor-pointer ${
                    n === page
                      ? "bg-[var(--caritas-green)] text-white border-[var(--caritas-green)]"
                      : "border-[var(--caritas-border)] hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              </Fragment>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
