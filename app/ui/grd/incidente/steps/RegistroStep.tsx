import { MapPin, Phone, Users } from "lucide-react";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { InfoField } from "@/app/ui/grd/incidente/components/InfoField";
import { iconoCategoria } from "@/app/ui/grd/incidente/config/estado-ui";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";

/** Paso "Registrar": muestra los datos del incidente y el empadronamiento inicial (solo lectura). */
export function RegistroStep({ data }: { data: IncidenciaDetalleOutput }) {
  const CatIcon = iconoCategoria(data.tipoEvento);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Código" value={data.codigoCaso ?? "—"} />
        <InfoField label="Fecha de registro" value={fmtDate(data.fechaRegistro)} />
        <InfoField
          label="Tipo de evento"
          value={
            <span className="flex items-center gap-1.5">
              <CatIcon className="w-4 h-4" />
              {data.tipoEvento ?? "—"}
            </span>
          }
        />
        <InfoField label="Gravedad" value={data.gravedad ?? "—"} />
        <InfoField
          label="Ubicación"
          value={
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {data.direccionEvento ?? "—"}
            </span>
          }
        />
        <InfoField label="Parroquia" value={data.parroquia ?? "—"} />
      </div>
      {data.descripcionEvento && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{data.descripcionEvento}</p>
        </div>
      )}
      {data.aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Informante</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-blue-700">{data.aviso.nombreInformante ?? "—"}</span>
            {data.aviso.telefonoInformante && (
              <span className="flex items-center gap-1 text-blue-700">
                <Phone className="w-3.5 h-3.5" />
                {data.aviso.telefonoInformante}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Familias y personas empadronadas */}
      {data.gruposFamiliares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Personas empadronadas — {data.gruposFamiliares.length} grupo(s) ·{" "}
            {data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0)} persona(s)
          </p>
          <div className="space-y-2">
            {data.gruposFamiliares.map((g) => (
              <div key={g.id} className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                <div className="bg-blue-100 px-3 py-1.5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">
                    {g.nombreReferencia ?? "Grupo familiar"}
                  </span>
                  <span className="text-xs text-blue-600">({g.totalPersonas} integrantes)</span>
                </div>
                {g.personas.length > 0 && (
                  <div className="p-2 space-y-1">
                    {g.personas.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded px-3 py-1.5 text-xs flex items-center gap-3"
                      >
                        <span className="font-medium text-gray-800">
                          {p.nombres} {p.apellidos ?? ""}
                        </span>
                        {p.edad && <span className="text-gray-500">{p.edad} años</span>}
                        {p.numeroDocumento && (
                          <span className="text-gray-400">DNI: {p.numeroDocumento}</span>
                        )}
                        {p.condicionEspecial && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                            {p.condicionEspecial}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
