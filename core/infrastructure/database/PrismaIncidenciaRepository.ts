import { prisma } from "@/app/lib/prisma";
import { Incidencia } from "../../domain/entities/incidencia/Incidencia";
import { IIncidenciaRepository } from "../../domain/repositories/IIncidenciaRepository";
import { CreateIncidenteData } from "../../application/dtos/IncidenciaDTO";
import { IncidenciaMapper } from "../mappers/IncidenciaMapper";

/** Coordenadas para Prisma (Decimal) solo si vienen ambas (RF07/RF08). */
function coords(data: CreateIncidenteData): { latitud?: number; longitud?: number } {
  return data.lat != null && data.lng != null ? { latitud: data.lat, longitud: data.lng } : {};
}

const SELECT_ESTADO = {
  idIncidencia: true,
  codigoCaso: true,
  idAviso: true,
  idParroquia: true,
  tituloIncidencia: true,
  tipoEvento: true,
  gravedad: true,
  estadoActual: true,
} as const;

/**
 * Repositorio Prisma del flujo de Incidencias.
 *
 * Encapsula TODA la orquestación de persistencia sobre las tablas del DER
 * (aviso, incidencia, grupos/personas, informes, solicitudes, entregas,
 * seguimientos, asignaciones, historial). Es la única capa que conoce Prisma;
 * las reglas de transición las valida el agregado `Incidencia` en el caso de uso.
 */
export class PrismaIncidenciaRepository implements IIncidenciaRepository {
  async nextCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.incidencia.findFirst({
      where: { codigoCaso: { startsWith: `GRD-${year}-` } },
      orderBy: { codigoCaso: "desc" },
      select: { codigoCaso: true },
    });
    const num = last?.codigoCaso
      ? parseInt(last.codigoCaso.replace(`GRD-${year}-`, "") || "0", 10)
      : 0;
    return `GRD-${year}-${String(num + 1).padStart(4, "0")}`;
  }

  async crear(codigo: string, data: CreateIncidenteData): Promise<string> {
    const idParroquiaDb = await this.buscarParroquia(data.parroquia);
    const alias = this.alias(data);
    const contexto = this.contexto(data);

    const aviso = await prisma.avisoEmergencia.create({
      data: {
        nombreInformante: data.reportaNombre.trim(),
        telefonoInformante: data.reportaTel.trim() || null,
        descripcion: data.descripcion || null,
        direccionPreliminar: data.direccion.trim(),
        estadoAviso: "RECIBIDO",
        medioAviso: data.reportaRol || null,
        ...(idParroquiaDb ? { idParroquia: idParroquiaDb } : {}),
        ...coords(data),
      },
    });

    const incidencia = await prisma.incidencia.create({
      data: {
        idAviso: aviso.idAviso,
        codigoCaso: codigo,
        tituloIncidencia: alias,
        tipoEvento: data.categoria,
        estadoActual: "ABIERTO",
        direccionEvento: data.direccion.trim(),
        descripcionEvento: data.descripcion || null,
        contextoCaso: contexto,
        gravedad: data.nivelAfectacion || null,
        ...(idParroquiaDb ? { idParroquia: idParroquiaDb } : {}),
        ...coords(data),
      },
    });

    await this.recrearGruposYPersonas(incidencia.idIncidencia, data);

    await prisma.historialEstadoIncidencia.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        estadoNuevo: "ABIERTO",
        motivoCambio: "Registro inicial del incidente",
      },
    });

    return incidencia.idIncidencia;
  }

  async findById(id: string): Promise<Incidencia | null> {
    const row = await prisma.incidencia.findUnique({
      where: { idIncidencia: id },
      select: SELECT_ESTADO,
    });
    return row ? IncidenciaMapper.toDomain(row) : null;
  }

  async actualizarDatos(id: string, data: CreateIncidenteData): Promise<void> {
    const inc = await prisma.incidencia.findUnique({
      where: { idIncidencia: id },
      select: { idAviso: true, estadoActual: true },
    });
    if (!inc) return;

    const idParroquiaDb = await this.buscarParroquia(data.parroquia);

    await prisma.incidencia.update({
      where: { idIncidencia: id },
      data: {
        tituloIncidencia: this.alias(data),
        tipoEvento: data.categoria,
        direccionEvento: data.direccion.trim(),
        descripcionEvento: data.descripcion || null,
        contextoCaso: this.contexto(data),
        gravedad: data.nivelAfectacion || null,
        idParroquia: idParroquiaDb,
        ...coords(data),
      },
    });

    if (inc.idAviso) {
      await prisma.avisoEmergencia.update({
        where: { idAviso: inc.idAviso },
        data: {
          nombreInformante: data.reportaNombre.trim() || null,
          telefonoInformante: data.reportaTel.trim() || null,
          medioAviso: data.reportaRol || null,
          descripcion: data.descripcion || null,
          direccionPreliminar: data.direccion.trim(),
        },
      });
    } else if (data.reportaNombre.trim()) {
      const aviso = await prisma.avisoEmergencia.create({
        data: {
          nombreInformante: data.reportaNombre.trim(),
          telefonoInformante: data.reportaTel.trim() || null,
          descripcion: data.descripcion || null,
          direccionPreliminar: data.direccion.trim(),
          estadoAviso: "RECIBIDO",
          medioAviso: data.reportaRol || null,
        },
      });
      await prisma.incidencia.update({
        where: { idIncidencia: id },
        data: { idAviso: aviso.idAviso },
      });
    }

    // Reemplazar grupos y personas
    const grupos = await prisma.grupoFamiliarAfectado.findMany({
      where: { idIncidencia: id },
      select: { idGrupoFamiliar: true },
    });
    const grupoIds = grupos.map((g) => g.idGrupoFamiliar);
    if (grupoIds.length > 0) {
      await prisma.personaAfectada.deleteMany({ where: { idGrupoFamiliar: { in: grupoIds } } });
      await prisma.grupoFamiliarAfectado.deleteMany({
        where: { idGrupoFamiliar: { in: grupoIds } },
      });
    }
    await this.recrearGruposYPersonas(id, data);

    // Solo registrar historial si el estado realmente cambió
  }

  async guardarTransicion(
    incidencia: Incidencia,
    motivo?: string,
    observaciones?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.incidencia.update({
        where: { idIncidencia: incidencia.id },
        data: { estadoActual: incidencia.estadoActual },
      }),
      prisma.historialEstadoIncidencia.create({
        data: {
          idIncidencia: incidencia.id,
          estadoAnterior: incidencia.estadoAnterior,
          estadoNuevo: incidencia.estadoActual,
          motivoCambio: motivo,
          observaciones,
        },
      }),
    ]);
  }

  async registrarAsignacion(
    idIncidencia: string,
    idBrigadista: string,
    instrucciones?: string
  ): Promise<void> {
    const dup = await prisma.asignacionBrigadistaIncidencia.findFirst({
      where: { idIncidencia, idBrigadistaParroquial: idBrigadista, estadoAsignacion: "ASIGNADA" },
    });
    if (dup) {
      if (instrucciones?.trim()) {
        await prisma.asignacionBrigadistaIncidencia.update({
          where: { idAsignacionBrigadista: dup.idAsignacionBrigadista },
          data: { observaciones: instrucciones.trim() },
        });
      }
      return;
    }
    await prisma.asignacionBrigadistaIncidencia.create({
      data: {
        idIncidencia,
        idBrigadistaParroquial: idBrigadista,
        estadoAsignacion: "ASIGNADA",
        origenAsignacion: "MANUAL",
        fechaAsignacion: new Date(),
        observaciones: instrucciones?.trim() || null,
      },
    });
    await prisma.brigadistaParroquial.update({
      where: { idBrigadistaParroquial: idBrigadista },
      data: { disponibilidad: "EN CAMPO" },
    });
  }

  async asignarEquipo(
    idIncidencia: string,
    data: {
      idResponsableBrigadista: string;
      idsEquipo: string[];
      instrucciones?: string;
      idUsuarioAsignador?: string;
    }
  ): Promise<void> {
    const equipoSinResp = data.idsEquipo.filter((id) => id !== data.idResponsableBrigadista);
    const idsObjetivo = [data.idResponsableBrigadista, ...equipoSinResp];
    const notas = data.instrucciones?.trim() || null;

    const actuales = await prisma.asignacionBrigadistaIncidencia.findMany({
      where: { idIncidencia, estadoAsignacion: "ASIGNADA" },
      select: { idAsignacionBrigadista: true, idBrigadistaParroquial: true },
    });

    const idsObjetivoSet = new Set(idsObjetivo);

    for (const a of actuales) {
      if (!idsObjetivoSet.has(a.idBrigadistaParroquial)) {
        await prisma.brigadistaParroquial.update({
          where: { idBrigadistaParroquial: a.idBrigadistaParroquial },
          data: { disponibilidad: "DISPONIBLE" },
        });
        await prisma.asignacionBrigadistaIncidencia.update({
          where: { idAsignacionBrigadista: a.idAsignacionBrigadista },
          data: {
            estadoAsignacion: "CERRADA",
            fechaCierreCampo: new Date(),
            esResponsableEquipo: false,
          },
        });
      }
    }

    await prisma.incidencia.update({
      where: { idIncidencia },
      data: { idUsuarioResponsableGRD: null },
    });

    for (const idBrig of idsObjetivo) {
      const esResp = idBrig === data.idResponsableBrigadista;
      const existente = actuales.find((a) => a.idBrigadistaParroquial === idBrig);
      if (existente) {
        await prisma.asignacionBrigadistaIncidencia.update({
          where: { idAsignacionBrigadista: existente.idAsignacionBrigadista },
          data: {
            esResponsableEquipo: esResp,
            rolEnEquipo: esResp ? "RESPONSABLE" : "INTEGRANTE",
            observaciones: notas,
            idUsuarioAsignadorGRD: data.idUsuarioAsignador ?? undefined,
          },
        });
      } else {
        await prisma.asignacionBrigadistaIncidencia.create({
          data: {
            idIncidencia,
            idBrigadistaParroquial: idBrig,
            idUsuarioAsignadorGRD: data.idUsuarioAsignador ?? null,
            estadoAsignacion: "ASIGNADA",
            origenAsignacion: "MANUAL",
            esResponsableEquipo: esResp,
            rolEnEquipo: esResp ? "RESPONSABLE" : "INTEGRANTE",
            fechaAsignacion: new Date(),
            observaciones: notas,
          },
        });
      }
      await prisma.brigadistaParroquial.update({
        where: { idBrigadistaParroquial: idBrig },
        data: { disponibilidad: "EN CAMPO" },
      });
    }
  }

  async asignarResponsable(
    idIncidencia: string,
    idUsuarioGRD: string,
    instrucciones?: string
  ): Promise<void> {
    await this.liberarBrigadistas(idIncidencia);
    await prisma.incidencia.update({
      where: { idIncidencia },
      data: {
        idUsuarioResponsableGRD: idUsuarioGRD,
        ...(instrucciones?.trim() ? { observacionesGenerales: instrucciones.trim() } : {}),
      },
    });
  }

  async guardarInforme(
    idIncidencia: string,
    informe: { titulo: string; tipo: string; resumen: string; contenido: string; estado: string }
  ): Promise<void> {
    await prisma.informe.create({
      data: {
        idIncidencia,
        tituloInforme: informe.titulo,
        tipoInforme: informe.tipo,
        resumen: informe.resumen,
        contenido: informe.contenido,
        estadoInforme: informe.estado,
      },
    });
  }

  async upsertSolicitudEnEvaluacion(
    idIncidencia: string,
    data: { motivo: string; descripcion: string; tipoAyuda: string }
  ): Promise<void> {
    const existente = await prisma.solicitudAyudaHumanitaria.findFirst({
      where: { idIncidencia, estadoSolicitud: { not: "RECHAZADA" } },
    });
    if (!existente) {
      await prisma.solicitudAyudaHumanitaria.create({
        data: {
          idIncidencia,
          motivoSolicitud: data.motivo,
          descripcionNecesidad: data.descripcion,
          tipoAyudaSolicitada: data.tipoAyuda,
          estadoSolicitud: "EN_EVALUACION",
        },
      });
    } else {
      await prisma.solicitudAyudaHumanitaria.update({
        where: { idSolicitud: existente.idSolicitud },
        data: { estadoSolicitud: "EN_EVALUACION", motivoSolicitud: data.motivo },
      });
    }
  }

  async resolverSolicitud(
    idIncidencia: string,
    decision: "APROBADA" | "EN_EVALUACION" | "RECHAZADA",
    observaciones?: string
  ): Promise<void> {
    const base = { idIncidencia, estadoSolicitud: { not: "RECHAZADA" } };
    if (decision === "APROBADA") {
      await prisma.solicitudAyudaHumanitaria.updateMany({
        where: base,
        data: {
          estadoSolicitud: "APROBADA",
          resultadoEvaluacion: "APROBADO",
          fechaEvaluacion: new Date(),
        },
      });
    } else if (decision === "RECHAZADA") {
      await prisma.solicitudAyudaHumanitaria.updateMany({
        where: base,
        data: { estadoSolicitud: "RECHAZADA", resultadoEvaluacion: "RECHAZADO", observaciones },
      });
    } else {
      await prisma.solicitudAyudaHumanitaria.updateMany({
        where: base,
        data: { estadoSolicitud: "EN_EVALUACION", observaciones },
      });
    }
  }

  async registrarEntrega(
    idIncidencia: string,
    data: {
      tipoAyuda: string;
      descripcionAyuda: string;
      lugarEntrega: string;
      observaciones?: string;
    }
  ): Promise<void> {
    await prisma.entregaAyudaHumanitaria.create({
      data: {
        idIncidencia,
        tipoAyuda: data.tipoAyuda,
        descripcionAyuda: data.descripcionAyuda,
        lugarEntrega: data.lugarEntrega,
        fechaEntrega: new Date(),
        observaciones: data.observaciones ?? null,
        entregaParcial: false,
        conformidadRecepcion: true,
      },
    });
  }

  async agregarSeguimiento(
    idIncidencia: string,
    data: {
      situacion: string;
      descripcion: string;
      necesidadesPendientes?: string;
      recomendaciones?: string;
    }
  ): Promise<void> {
    await prisma.seguimientoIncidencia.create({
      data: {
        idIncidencia,
        situacion: data.situacion,
        descripcion: data.descripcion,
        necesidadesPendientes: data.necesidadesPendientes || null,
        recomendaciones: data.recomendaciones || null,
        estado: "ACTIVO",
      },
    });
  }

  async liberarBrigadistas(idIncidencia: string): Promise<void> {
    const asignaciones = await prisma.asignacionBrigadistaIncidencia.findMany({
      where: { idIncidencia, estadoAsignacion: "ASIGNADA" },
      select: { idBrigadistaParroquial: true },
    });
    for (const a of asignaciones) {
      await prisma.brigadistaParroquial.update({
        where: { idBrigadistaParroquial: a.idBrigadistaParroquial },
        data: { disponibilidad: "DISPONIBLE" },
      });
    }
    if (asignaciones.length) {
      await prisma.asignacionBrigadistaIncidencia.updateMany({
        where: { idIncidencia, estadoAsignacion: "ASIGNADA" },
        data: { estadoAsignacion: "CERRADA", fechaCierreCampo: new Date() },
      });
    }
  }

  // ── Helpers de orquestación ────────────────────────────────────────────────

  private async buscarParroquia(nombre: string): Promise<string | null> {
    if (!nombre) return null;
    const rec = await prisma.parroquia.findFirst({
      where: { nombre },
      select: { idParroquia: true },
    });
    return rec?.idParroquia ?? null;
  }

  private alias(data: CreateIncidenteData): string {
    const parrShort = data.parroquia ? data.parroquia.split(" ").slice(-2).join(" ") : "";
    return parrShort
      ? `${data.categoria}-${data.distrito}-${parrShort}`
      : `${data.categoria}-${data.distrito}`;
  }

  private contexto(data: CreateIncidenteData): string {
    const todasNecesidades = [
      ...data.necesidades.filter((n) => n !== "Otros"),
      ...(data.necesidadOtra.trim() ? [data.necesidadOtra.trim()] : []),
    ];
    return JSON.stringify({
      pais: data.pais,
      region: data.region,
      distrito: data.distrito,
      parroquia: data.parroquia,
      referencia: data.referencia,
      causa: data.causa,
      necesidades: todasNecesidades,
      necesidadesObs: data.necesidadesObs,
    });
  }

  private async recrearGruposYPersonas(
    idIncidencia: string,
    data: CreateIncidenteData
  ): Promise<void> {
    const familiaIdMap: Record<string, string> = {};

    for (const familia of data.familias) {
      const grupo = await prisma.grupoFamiliarAfectado.create({
        data: {
          idIncidencia,
          nombreReferencia: familia.nombre,
          observaciones: familia.observaciones || null,
        },
      });
      familiaIdMap[familia.id] = grupo.idGrupoFamiliar;
    }

    const sinFamilia = data.personas.filter((p) => !p.familiaId);
    if (sinFamilia.length > 0) {
      const grupoInd = await prisma.grupoFamiliarAfectado.create({
        data: { idIncidencia, nombreReferencia: "Personas individuales" },
      });
      for (const p of sinFamilia) familiaIdMap[`ind_${p.id}`] = grupoInd.idGrupoFamiliar;
    }

    for (const persona of data.personas) {
      const idGrupo = persona.familiaId
        ? (familiaIdMap[persona.familiaId] ?? Object.values(familiaIdMap)[0])
        : (familiaIdMap[`ind_${persona.id}`] ?? Object.values(familiaIdMap)[0]);
      if (!idGrupo) continue;

      await prisma.personaAfectada.create({
        data: {
          idGrupoFamiliar: idGrupo,
          tipoDocumento: persona.tipoDoc || null,
          numeroDocumento: persona.dni || null,
          nombres: persona.nombre,
          apellidos:
            [persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(" ") || null,
          sexo: persona.genero || null,
          parentesco: persona.parentesco || null,
          condicionEspecial: persona.situacionActual || null,
          esVulnerable: Boolean(persona.situacionActual),
          telefono: persona.celular || null,
          fechaNacimiento: persona.edad
            ? new Date(new Date().getFullYear() - parseInt(persona.edad), 0, 1)
            : null,
        },
      });
    }
  }
}
