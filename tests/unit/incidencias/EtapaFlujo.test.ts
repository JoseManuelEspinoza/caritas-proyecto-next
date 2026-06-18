import { describe, it, expect } from "vitest";
import {
  ETAPAS_ORDEN,
  ESTADOS_POR_ETAPA,
  etapaDeEstado,
  indiceEtapa,
  indiceEtapaDeEstado,
} from "@/core/domain/entities/incidencia/EtapaFlujo";
import { TRANSICIONES, EstadoIncidencia } from "@/core/domain/entities/incidencia/EstadoIncidencia";

describe("EtapaFlujo — mapeo etapa↔estado", () => {
  it("cada estado del dominio pertenece a exactamente una etapa", () => {
    const estados = Object.keys(TRANSICIONES) as EstadoIncidencia[];
    for (const estado of estados) {
      const etapasQueLoContienen = ETAPAS_ORDEN.filter((e) =>
        ESTADOS_POR_ETAPA[e].includes(estado)
      );
      expect(etapasQueLoContienen).toHaveLength(1);
    }
  });

  it("etapaDeEstado devuelve la etapa correcta", () => {
    expect(etapaDeEstado("ABIERTO")).toBe("REGISTRO");
    expect(etapaDeEstado("ASIGNADO")).toBe("ASIGNACION");
    expect(etapaDeEstado("DATA RECOPILADA")).toBe("RECOPILACION");
    expect(etapaDeEstado("EN EVALUACION")).toBe("REVISION");
    expect(etapaDeEstado("APROBADO")).toBe("REVISION");
    expect(etapaDeEstado("ATENDIDO")).toBe("ATENCION");
    expect(etapaDeEstado("SEGUIMIENTO ABIERTO")).toBe("SEGUIMIENTO");
    expect(etapaDeEstado("CERRADO")).toBe("CIERRE");
  });

  it("el orden de etapas es estable y consistente con sus índices", () => {
    ETAPAS_ORDEN.forEach((etapa, i) => {
      expect(indiceEtapa(etapa)).toBe(i);
    });
  });

  it("indiceEtapaDeEstado respeta el orden del flujo", () => {
    expect(indiceEtapaDeEstado("ABIERTO")).toBe(0);
    expect(indiceEtapaDeEstado("ATENDIDO")).toBe(4);
    expect(indiceEtapaDeEstado("CERRADO")).toBe(6);
  });

  it("[borde] etapaDeEstado retorna REGISTRO como fallback para estado desconocido", () => {
    expect(etapaDeEstado("DESCONOCIDO" as any)).toBe("REGISTRO");
  });
});
