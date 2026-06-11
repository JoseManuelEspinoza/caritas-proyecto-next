// SugerirBrigadistas.usecase.ts — Algoritmo de sugerencia de brigadistas (RF36)
// Sistema GRD Cáritas Lima | 1INF47 2026-1
//
// Opción HÍBRIDA: combina un grafo de adyacencia de parroquias (cascada por
// niveles: incidente → vecinas → cercanas) con un SCORE COMBINADO por candidato
// (confianza + disponibilidad/carga + cercanía). SUGIERE hasta `topN`; NO asigna.
//
// Depende de `ISugerenciaBrigadistasRepository` (dominio): es independiente de
// Prisma y testeable con un mock.

import type { ISugerenciaBrigadistasRepository } from "../../../domain/repositories/ISugerenciaBrigadistasRepository";
import { haversine } from "../../../domain/services/haversine";
import { confianzaMixta } from "../../../domain/services/confianza";
import { construirAdyacencia, nivelesPorSaltos } from "../../../domain/services/grafoParroquias";
import {
  CONFIG_DEFAULT,
  type BrigadistaCandidatoRaw,
  type CandidatoSugerido,
  type ConfigAlgoritmo,
  type EntradaAlgoritmo,
  type SalidaAlgoritmo,
} from "../../dtos/SugerenciaBrigadistasDTO";

function buildCandidato(
  b: BrigadistaCandidatoRaw,
  distanciaKm: number | null,
  mismaZonaPastoral: boolean | null,
  scoreConfianza: number | null
): CandidatoSugerido {
  return {
    idBrigadistaParroquial: b.idBrigadistaParroquial,
    nombres: b.nombres,
    apellidos: b.apellidos,
    celular: b.celular ?? null,
    correo: b.correo ?? null,
    idParroquia: b.idParroquia,
    nombreParroquia: b.parroquia?.nombre ?? "",
    tipo: "brigadista",
    disponibilidad: b.disponibilidad,
    distanciaKm,
    mismaZonaPastoral,
    scoreConfianza,
  };
}

/** Fase 1 (misma parroquia): orden por scoreConfianza DESC; desempate alfabético. */
function ordenarPorConfianza(a: CandidatoSugerido, b: CandidatoSugerido): number {
  if (a.scoreConfianza !== null && b.scoreConfianza !== null && b.scoreConfianza !== a.scoreConfianza) {
    return b.scoreConfianza - a.scoreConfianza;
  }
  return a.apellidos.localeCompare(b.apellidos);
}

/** Fase 2 (grafo): primero el nivel más cercano; dentro del nivel, mayor scoreFinal. */
function ordenarPorNivelYScore(a: CandidatoSugerido, b: CandidatoSugerido): number {
  const na = a.nivel ?? 99;
  const nb = b.nivel ?? 99;
  if (na !== nb) return na - nb;
  const sa = a.scoreFinal ?? 0;
  const sb = b.scoreFinal ?? 0;
  if (sb !== sa) return sb - sa;
  if (a.distanciaKm !== null && b.distanciaKm !== null && a.distanciaKm !== b.distanciaKm) {
    return a.distanciaKm - b.distanciaKm;
  }
  return a.apellidos.localeCompare(b.apellidos);
}

/**
 * Caso de uso del RF36.
 *   F1 → brigadistas disponibles en la parroquia del incidente (orden por confianza).
 *   F2 → otras parroquias, en cascada por niveles del grafo (incidente→vecinas→cercanas),
 *        rankeadas por score combinado (confianza + carga + cercanía).
 *   F3 → sin candidatos: lista vacía + mensaje para intervención manual.
 */
export class SugerirBrigadistasUseCase {
  constructor(private readonly repo: ISugerenciaBrigadistasRepository) {}

  async execute(
    entrada: EntradaAlgoritmo,
    config: ConfigAlgoritmo = CONFIG_DEFAULT
  ): Promise<SalidaAlgoritmo> {
    const pesos = { pesoManual: config.pesoManual, pesoAutomatico: config.pesoAutomatico };
    const topN = config.topN;
    const radioAdy = config.radioAdyacenciaKm ?? CONFIG_DEFAULT.radioAdyacenciaKm!;
    const distMax = config.distanciaMaxKm ?? CONFIG_DEFAULT.distanciaMaxKm!;
    const wConf = config.pesoConfianza ?? CONFIG_DEFAULT.pesoConfianza!;
    const wDisp = config.pesoDisponibilidad ?? CONFIG_DEFAULT.pesoDisponibilidad!;
    const wCerc = config.pesoCercania ?? CONFIG_DEFAULT.pesoCercania!;

    const parroquiaRef = await this.repo.getParroquia(entrada.idParroquia);

    // CB-02: si el incidente no trae GPS → usar las coordenadas de la parroquia.
    let latInc = entrada.latitud;
    let lngInc = entrada.longitud;
    if (latInc === null || lngInc === null) {
      latInc = parroquiaRef?.latitud ?? null;
      lngInc = parroquiaRef?.longitud ?? null;
    }
    const zonaPastoralInc = parroquiaRef?.idZonaPastoral ?? null;

    // ── FASE 1 — Brigadistas disponibles en la parroquia del incidente ──
    const brigF1 = await this.repo.getBrigadistasDisponiblesPorParroquia(entrada.idParroquia);
    if (brigF1.length > 0) {
      const candidatos = await Promise.all(
        brigF1.map(async (b) => {
          const [inc, tr, carga] = await Promise.all([
            this.repo.getIncidenciasAtendidas(b.idBrigadistaParroquial),
            this.repo.getTiempoRespuestaPromedioHoras(b.idBrigadistaParroquial),
            this.repo.getCargaActual(b.idBrigadistaParroquial),
          ]);
          const score = confianzaMixta(b, inc, pesos, tr);
          const c = buildCandidato(b, 0, null, score);
          c.cargaActual = carga;
          c.tiempoRespuestaHoras = tr;
          c.nivel = 1;
          c.scoreFinal = score; // misma parroquia → cercanía ≈ igual, manda la confianza
          return c;
        })
      );
      return {
        listaSugerida: candidatos.sort(ordenarPorConfianza).slice(0, topN),
        faseResultado: "F1",
        mensaje: null,
      };
    }

    // ── FASE 2 — Otras parroquias, en cascada por niveles del grafo ──
    if (latInc !== null && lngInc !== null) {
      const parroquias = await this.repo.getParroquiasConCoords();
      const adj = construirAdyacencia(parroquias, radioAdy);
      const niveles = nivelesPorSaltos(entrada.idParroquia, adj, 3);

      const todos = await this.repo.getTodosBrigadistasDisponibles(entrada.idParroquia);
      const enriquecidos: CandidatoSugerido[] = await Promise.all(
        todos
          .filter((b) => b.parroquia?.latitud != null && b.parroquia?.longitud != null)
          .map(async (b) => {
            const dist = parseFloat(
              haversine(
                b.parroquia.latitud as number,
                b.parroquia.longitud as number,
                latInc as number,
                lngInc as number
              ).toFixed(2)
            );
            const [inc, tr, carga] = await Promise.all([
              this.repo.getIncidenciasAtendidas(b.idBrigadistaParroquial),
              this.repo.getTiempoRespuestaPromedioHoras(b.idBrigadistaParroquial),
              this.repo.getCargaActual(b.idBrigadistaParroquial),
            ]);
            const confianza = confianzaMixta(b, inc, pesos, tr);
            const proximidad = Math.max(0, Math.min(10, 10 * (1 - dist / distMax)));
            const disponibilidad = 10 / (1 + carga); // menos carga = mayor
            const scoreFinal = parseFloat(
              (wConf * confianza + wDisp * disponibilidad + wCerc * proximidad).toFixed(2)
            );
            const mismaZona =
              zonaPastoralInc !== null ? b.parroquia.idZonaPastoral === zonaPastoralInc : null;

            const c = buildCandidato(b, dist, mismaZona, confianza);
            c.cargaActual = carga;
            c.tiempoRespuestaHoras = tr;
            c.nivel = niveles.get(b.idParroquia) ?? 99; // 99 = fuera del grafo (sin coords/aislada)
            c.scoreFinal = scoreFinal;
            return c;
          })
      );

      if (enriquecidos.length > 0) {
        // Cascada suave: primero el nivel más cercano (ordenarPorNivelYScore),
        // y se completa con niveles más lejanos hasta llenar topN.
        return {
          listaSugerida: enriquecidos.sort(ordenarPorNivelYScore).slice(0, topN),
          faseResultado: "F2",
          mensaje: null,
        };
      }
    }

    // ── FASE 3 — Sin candidatos ──
    await this.repo.registrarIntentoFallido(entrada.idParroquia, entrada.tipoIncidente);
    return {
      listaSugerida: [],
      faseResultado: "F3",
      mensaje:
        "No se encontraron brigadistas disponibles en ninguna zona. " +
        "Se requiere intervención manual del especialista.",
    };
  }
}
