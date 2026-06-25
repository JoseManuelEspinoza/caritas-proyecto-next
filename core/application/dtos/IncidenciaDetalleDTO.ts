import type { Rol } from "../../domain/value-objects/Rol";

/**
 * Read-model (proyección de salida) del detalle de una incidencia.
 * Antes vivía como `IncidentData` dentro de la UI; ahora es el contrato de
 * lectura de la capa de aplicación que consume la pantalla de detalle.
 */

export type PersonaDetalle = {
  id: string;
  nombres: string;
  apellidos: string | null;
  edad: string | null;
  sexo: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  parentesco: string | null;
  condicionEspecial: string | null;
  telefono: string | null;
  /** Comentario/observación individual de la persona. */
  observaciones: string | null;
};

export type AvisoDetalle = {
  nombreInformante: string | null;
  telefonoInformante: string | null;
  descripcion: string | null;
};

export type AsignacionDetalle = {
  brigadistaId: string;
  nombres: string;
  apellidos: string | null;
  celular: string | null;
  parroquia: string | null;
  fechaAsignacion: string;
  esResponsable: boolean;
  observaciones: string | null;
};

export type GrupoFamiliarDetalle = {
  id: string;
  nombreReferencia: string | null;
  /** Anotación/observación de la familia (fuente única, editable en empadronamiento). */
  observaciones: string | null;
  totalPersonas: number;
  personas: PersonaDetalle[];
};

export type InformeDetalle = {
  id: string;
  titulo: string;
  tipo: string | null;
  resumen: string | null;
  contenido: string | null;
  estado: string;
  fecha: string;
};

export type SeguimientoDetalle = {
  id: string;
  situacion: string | null;
  descripcion: string | null;
  necesidadesPendientes: string | null;
  recomendaciones: string | null;
  fecha: string;
};

export type EntregaDetalle = {
  id: string;
  tipoAyuda: string | null;
  descripcionAyuda: string | null;
  lugarEntrega: string | null;
  fecha: string | null;
  observaciones: string | null;
};

export type HistorialDetalle = {
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivoCambio: string | null;
  observaciones: string | null;
  fecha: string;
};

export type SolicitudComiteDetalle = {
  estado: string;
  resultado: string | null;
  observaciones: string | null;
  fecha: string | null;
};

export type BrigadistaDisponible = {
  id: string;
  nombres: string;
  apellidos: string | null;
  celular: string | null;
  disponibilidad: string;
  parroquia: string | null;
};

export type EvidenciaDetalle = {
  id: string;
  nombreArchivo: string;
  urlArchivo: string;
  formato: string | null;
  descripcion: string | null;
  fecha: string;
  tamano: number | null;
  lat: number | null;
  lng: number | null;
  cargadoPor: string | null;
};

export type CatalogoArticuloDetalle = {
  codigo: string;
  valor: string;
  descripcion: string | null;
  catalogo: string;
};

/** Kit real del módulo de Kits de Emergencia, con su composición y stock. */
export type KitEmergenciaDetalle = {
  id: string;
  tipoKit: string;
  descripcion: string | null;
  stockActual: number;
  articulos: { codigo: string | null; descripcion: string; cantidad: number }[];
};

/** Contexto del usuario que abre el detalle (sesión + relación con el caso). */
export type ContextoUsuarioDetalle = {
  role: Rol;
  userId: string;
  idUsuarioGRDActual: string | null;
  currentUserName: string;
  currentUserBrigadistaId: string | null;
  isBrigadistaAsignado: boolean;
  isResponsableGRD: boolean;
};

export type IncidenciaDetalleOutput = {
  idIncidencia: string;
  codigoCaso: string | null;
  tituloIncidencia: string | null;
  tipoEvento: string | null;
  estadoActual: string;
  direccionEvento: string | null;
  descripcionEvento: string | null;
  gravedad: string | null;
  causa: string | null;
  reportanteRol: string | null;
  fechaRegistro: string;
  parroquia: string | null;
  /** Para el algoritmo de sugerencia (RF36): parroquia y coordenadas del incidente. */
  idParroquia: string | null;
  latitud: number | null;
  longitud: number | null;
  aviso: AvisoDetalle | null;
  asignaciones: AsignacionDetalle[];
  responsableGRD: { id: string; nombre: string; correo: string | null } | null;
  instruccionesAsignacion: string | null;
  gruposFamiliares: GrupoFamiliarDetalle[];
  informes: InformeDetalle[];
  seguimientos: SeguimientoDetalle[];
  entregas: EntregaDetalle[];
  historial: HistorialDetalle[];
  solicitudComite: SolicitudComiteDetalle | null;
  brigadistasDisponibles: BrigadistaDisponible[];
  evidencias: EvidenciaDetalle[];
  catalogoArticulos: CatalogoArticuloDetalle[];
  kitsEmergencia: KitEmergenciaDetalle[];
  parroquias: string[];
} & ContextoUsuarioDetalle;
