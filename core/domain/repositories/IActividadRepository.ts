import { ActividadPreventiva } from "../entities/actividad/ActividadPreventiva";

export interface BrigadistaAsignado {
  idBrigadistaParroquial: string;
  esResponsable: boolean;
}

export interface IActividadRepository {
  save(actividad: ActividadPreventiva): Promise<void>;
  update(actividad: ActividadPreventiva): Promise<void>;
  findById(id: string): Promise<ActividadPreventiva | null>;
  findAll(): Promise<ActividadPreventiva[]>;
  nextCodigo(): Promise<string>;

  /** Crea registros en simulacro_brigadista y actualiza disponibilidad. */
  asignarEquipo(
    idActividad: string,
    responsableId: string | null,
    equipoIds: string[],
    asignadorId: string
  ): Promise<void>;

  /** Autoasignación: limpia brigadistas previos y pone usuarioResponsableGRD. */
  autoasignarme(
    idActividad: string,
    idUsuarioGRD: string
  ): Promise<void>;
}
