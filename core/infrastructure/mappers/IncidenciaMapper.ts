import { Incidencia } from "../../domain/entities/incidencia/Incidencia";
import { EstadoIncidencia } from "../../domain/entities/incidencia/EstadoIncidencia";

/** Fila mínima necesaria para reconstruir el agregado (estado + identificadores). */
export type IncidenciaEstadoRow = {
  idIncidencia: string;
  codigoCaso: string | null;
  idAviso: string | null;
  idParroquia: string | null;
  tituloIncidencia: string | null;
  tipoEvento: string | null;
  gravedad: string | null;
  estadoActual: string;
};

/** Traduce la fila de `Incidencia` al agregado de dominio (solo lo necesario para el flujo). */
export const IncidenciaMapper = {
  toDomain(row: IncidenciaEstadoRow): Incidencia {
    return Incidencia.desdePersistencia({
      id: row.idIncidencia,
      codigoCaso: row.codigoCaso,
      idAviso: row.idAviso,
      idParroquia: row.idParroquia,
      tituloIncidencia: row.tituloIncidencia,
      tipoEvento: row.tipoEvento,
      gravedad: row.gravedad,
      estadoActual: row.estadoActual as EstadoIncidencia,
    });
  },
};
