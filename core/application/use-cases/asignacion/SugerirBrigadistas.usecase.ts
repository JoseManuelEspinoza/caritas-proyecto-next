// SugerirBrigadistas.usecase.ts — Algoritmo de sugerencia de brigadistas (RF36)
// Sistema GRD Cáritas Lima | 1INF47 2026-1
//
// IMPORTANTE: este caso de uso SUGIERE hasta `topN` brigadistas; NO asigna
// automáticamente. La decisión final es del especialista GRD.
//
// Depende de `ISugerenciaBrigadistasRepository` (dominio), por lo que es
// independiente de Prisma y testeable con un mock.

import type { ISugerenciaBrigadistasRepository } from '../../../domain/repositories/ISugerenciaBrigadistasRepository'
import { haversine } from '../../../domain/services/haversine'
import { confianzaMixta } from '../../../domain/services/confianza'
import {
  CONFIG_DEFAULT,
  type BrigadistaCandidatoRaw,
  type CandidatoSugerido,
  type ConfigAlgoritmo,
  type EntradaAlgoritmo,
  type SalidaAlgoritmo,
} from '../../dtos/SugerenciaBrigadistasDTO'

// ── Helper: construir un CandidatoSugerido a partir del brigadista crudo ───────
function buildCandidato(
  b: BrigadistaCandidatoRaw,
  distanciaKm: number | null,
  mismaZonaPastoral: boolean | null,
  scoreConfianza: number | null,
): CandidatoSugerido {
  return {
    idBrigadistaParroquial: b.idBrigadistaParroquial,
    nombres: b.nombres,
    apellidos: b.apellidos,
    celular: b.celular ?? null,
    correo: b.correo ?? null,
    idParroquia: b.idParroquia,
    nombreParroquia: b.parroquia?.nombre ?? '',
    tipo: 'brigadista',
    disponibilidad: b.disponibilidad,
    distanciaKm,
    mismaZonaPastoral,
    scoreConfianza,
  }
}

// ── Helper: orden de la lista sugerida ─────────────────────────────────────────
//   Fase 1 → por scoreConfianza DESC; Fase 2 → por distanciaKm ASC; desempate alfabético.
function ordenar(a: CandidatoSugerido, b: CandidatoSugerido): number {
  if (a.scoreConfianza !== null && b.scoreConfianza !== null) {
    if (b.scoreConfianza !== a.scoreConfianza) return b.scoreConfianza - a.scoreConfianza
  }
  if (a.distanciaKm !== null && b.distanciaKm !== null) {
    if (a.distanciaKm !== b.distanciaKm) return a.distanciaKm - b.distanciaKm
  }
  return a.apellidos.localeCompare(b.apellidos)
}

/**
 * Caso de uso del RF36. Recorre las fases hasta encontrar candidatos:
 *   F1  → brigadistas disponibles en la parroquia del incidente (orden por confianza)
 *   F2  → brigadistas disponibles en todas las parroquias (orden por distancia Haversine)
 *   F2B → voluntarios validados (pendiente: falta el modelo VoluntarioAliado)
 *   F3  → sin candidatos: lista vacía + mensaje para intervención manual
 */
export class SugerirBrigadistasUseCase {
  constructor(private readonly repo: ISugerenciaBrigadistasRepository) {}

  async execute(
    entrada: EntradaAlgoritmo,
    config: ConfigAlgoritmo = CONFIG_DEFAULT,
  ): Promise<SalidaAlgoritmo> {
    // CB-02: si el incidente no trae GPS → usar las coordenadas de la parroquia.
    let latIncidente = entrada.latitud
    let lngIncidente = entrada.longitud

    const parroquiaRef = await this.repo.getParroquia(entrada.idParroquia)

    if (latIncidente === null || lngIncidente === null) {
      latIncidente = parroquiaRef?.latitud ?? null
      lngIncidente = parroquiaRef?.longitud ?? null
    }

    const zonaPastoralIncidente = parroquiaRef?.idZonaPastoral ?? null

    // ───────────────────────────────────────────────────────────────────────
    // FASE 1 — Brigadistas disponibles en la parroquia del incidente
    // ───────────────────────────────────────────────────────────────────────
    const brigadistasF1 = await this.repo.getBrigadistasDisponiblesPorParroquia(
      entrada.idParroquia,
    )

    if (brigadistasF1.length > 0) {
      const candidatos: CandidatoSugerido[] = await Promise.all(
        brigadistasF1.map(async (b) => {
          const inc = await this.repo.getIncidenciasAtendidas(b.idBrigadistaParroquial)
          const score = confianzaMixta(b, inc, config)
          return buildCandidato(b, null, null, score)
        }),
      )

      return {
        listaSugerida: candidatos.sort(ordenar).slice(0, config.topN),
        faseResultado: 'F1',
        mensaje: null,
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // FASE 2 — Todos los brigadistas disponibles, ordenados por distancia
    //
    // ⚠️ La zona pastoral es indicador INFORMATIVO (`mismaZonaPastoral`), NO un
    //    criterio de exclusión. El especialista decide. (En producción saldrá
    //    null hasta que exista el modelo ZonaPastoral.)
    // ───────────────────────────────────────────────────────────────────────
    if (latIncidente !== null && lngIncidente !== null) {
      const todosF2 = await this.repo.getTodosBrigadistasDisponibles(entrada.idParroquia)

      const candidatosF2: CandidatoSugerido[] = todosF2
        .filter((b) => b.parroquia?.latitud != null && b.parroquia?.longitud != null)
        .map((b) => {
          const dist = haversine(
            b.parroquia.latitud as number,
            b.parroquia.longitud as number,
            latIncidente as number,
            lngIncidente as number,
          )
          const mismaZona =
            zonaPastoralIncidente !== null
              ? b.parroquia.idZonaPastoral === zonaPastoralIncidente
              : null

          return buildCandidato(b, parseFloat(dist.toFixed(2)), mismaZona, null)
        })

      if (candidatosF2.length > 0) {
        return {
          listaSugerida: candidatosF2.sort(ordenar).slice(0, config.topN),
          faseResultado: 'F2',
          mensaje: null,
        }
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // FASE 2B — Voluntarios validados (validado=true), ordenados por distancia.
    //
    // ⚠️ PENDIENTE: el modelo `VoluntarioAliado` aún no existe en el schema Prisma.
    //    Para activarla cuando exista:
    //      1) Añadir un método al repositorio, p. ej.
    //         `getVoluntariosValidados(): Promise<BrigadistaCandidatoRaw[]>`
    //         (filtrando validado=true y mapeando con tipo 'voluntario').
    //      2) Replicar aquí el bloque de la Fase 2 (distancia Haversine + orden),
    //         marcando los candidatos con `tipo: 'voluntario'` y
    //         `faseResultado: 'F2B'`.
    // ───────────────────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────────────────
    // FASE 3 — Sin candidatos disponibles
    // ───────────────────────────────────────────────────────────────────────
    await this.repo.registrarIntentoFallido(entrada.idParroquia, entrada.tipoIncidente)

    return {
      listaSugerida: [],
      faseResultado: 'F3',
      mensaje:
        'No se encontraron brigadistas disponibles en ninguna zona. ' +
        'Se requiere intervención manual del especialista.',
    }
  }
}
