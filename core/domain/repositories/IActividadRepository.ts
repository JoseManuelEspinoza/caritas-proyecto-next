import { ActividadPreventiva } from "../entities/actividad/ActividadPreventiva";

export interface IActividadRepository {
  save(actividad: ActividadPreventiva): Promise<void>;
  update(actividad: ActividadPreventiva): Promise<void>;
  findById(id: string): Promise<ActividadPreventiva | null>;
  findAll(): Promise<ActividadPreventiva[]>;
  nextCodigo(): Promise<string>;
}
