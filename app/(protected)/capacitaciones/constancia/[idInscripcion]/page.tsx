import { notFound } from "next/navigation";
import { obtenerDatosConstancia } from "@/app/actions/capacitaciones";
import { PrintButton } from "./PrintButton";

function fmtFecha(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ConstanciaPage({
  params,
}: {
  params: Promise<{ idInscripcion: string }>;
}) {
  const { idInscripcion } = await params;
  const datos = await obtenerDatosConstancia(idInscripcion);
  if (!datos) notFound();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 print:bg-white print:p-0">
      {/* Botón imprimir — oculto al imprimir */}
      <div className="mb-6 print:hidden">
        <PrintButton />
      </div>

      {/* Certificado */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg border-4 border-[var(--caritas-green)] overflow-hidden print:shadow-none print:rounded-none print:border-4">
        {/* Encabezado */}
        <div className="bg-[var(--caritas-green)] px-10 py-7 text-center">
          <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-1">
            Cáritas del Perú
          </p>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Constancia de Capacitación
          </h1>
        </div>

        {/* Cuerpo */}
        <div className="px-12 py-10 text-center space-y-6">
          <p className="text-gray-500 text-sm">Se otorga la presente constancia a:</p>

          <div>
            <p className="text-3xl font-bold text-[var(--caritas-text)] leading-tight">
              {datos.nombreParticipante}
            </p>
            <div className="mt-1 mx-auto w-24 h-0.5 bg-[var(--caritas-green)]" />
          </div>

          <p className="text-gray-600 text-base">
            Por haber completado satisfactoriamente el curso:
          </p>

          <div className="bg-gray-50 border border-[var(--caritas-border)] rounded-xl px-8 py-5">
            <p className="text-lg font-bold text-[var(--caritas-text)]">{datos.nombreCurso}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{datos.codigoCurso}</p>
          </div>

          {datos.nota != null && (
            <p className="text-sm text-gray-500">
              Nota obtenida:{" "}
              <span className="font-semibold text-[var(--caritas-text)]">
                {datos.nota.toFixed(1)} / 20
              </span>
            </p>
          )}

          <p className="text-sm text-gray-400">
            Lima, {fmtFecha(datos.fechaCertificacion)}
          </p>
        </div>

        {/* Pie */}
        <div className="border-t border-[var(--caritas-border)] px-12 py-6 flex items-center justify-between">
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Especialista GRD</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-300 font-mono">
              ID: {datos.idCertificacion}
            </p>
            <p className="text-[10px] text-gray-300">Documento generado automáticamente</p>
          </div>
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Coordinador GRD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
