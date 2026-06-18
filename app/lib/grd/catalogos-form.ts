import "server-only";
import { prisma } from "@/app/lib/prisma";

/**
 * Carga los catálogos del sistema que alimentan los formularios de GRD.
 * Los valores se administran en /catalogos (módulo Catálogos); las vistas NO
 * deben hardcodear estas listas. Si un catálogo está vacío o inactivo, la
 * vista usa su lista de respaldo para no bloquear el registro.
 */
export type CatalogosIncidente = {
  fuentesAlerta: string[];
  tiposEvento: string[];
  necesidades: string[];
  nivelesAfectacion: string[];
  gruposVulnerables: string[];
};

const CATALOGOS: Record<keyof CatalogosIncidente, string> = {
  fuentesAlerta: "Fuentes de Alerta",
  tiposEvento: "Tipos de Evento",
  necesidades: "Necesidades",
  nivelesAfectacion: "Niveles de Afectación",
  gruposVulnerables: "Grupos Vulnerables",
};

export async function cargarCatalogosIncidente(): Promise<CatalogosIncidente> {
  const detalles = await prisma.catalogoDetalleGRD.findMany({
    where: {
      estado: "ACTIVO",
      catalogo: { estado: "ACTIVO", nombreCatalogo: { in: Object.values(CATALOGOS) } },
    },
    select: { valor: true, orden: true, catalogo: { select: { nombreCatalogo: true } } },
    orderBy: [{ orden: "asc" }, { valor: "asc" }],
  });

  const porCatalogo = (nombre: string) =>
    detalles.filter((d) => d.catalogo?.nombreCatalogo === nombre).map((d) => d.valor);

  return {
    fuentesAlerta: porCatalogo(CATALOGOS.fuentesAlerta),
    tiposEvento: porCatalogo(CATALOGOS.tiposEvento),
    necesidades: porCatalogo(CATALOGOS.necesidades),
    nivelesAfectacion: porCatalogo(CATALOGOS.nivelesAfectacion),
    gruposVulnerables: porCatalogo(CATALOGOS.gruposVulnerables),
  };
}

export type CatalogosSimulacro = {
  tiposActividad: string[];
};

const NOMBRE_CATALOGO_SIMULACRO = "Tipos de Actividad Preventiva";

export async function cargarCatalogosSimulacro(): Promise<CatalogosSimulacro> {
  const detalles = await prisma.catalogoDetalleGRD.findMany({
    where: {
      estado: "ACTIVO",
      catalogo: { estado: "ACTIVO", nombreCatalogo: NOMBRE_CATALOGO_SIMULACRO },
    },
    select: { valor: true, orden: true },
    orderBy: [{ orden: "asc" }, { valor: "asc" }],
  });

  return {
    tiposActividad: detalles.map((d) => d.valor),
  };
}
