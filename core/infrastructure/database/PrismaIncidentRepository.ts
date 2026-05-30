import { prisma } from '@/app/lib/prisma'
import { Incident } from '../../domain/entities/incident/Incident'
import { IIncidentRepository, IncidentFilter } from '../../domain/repositories/IIncidentRepository'
import { IncidentMapper } from '../mappers/IncidentMapper'

const INCLUDE = { affectedPeople: true, history: { orderBy: { timestamp: 'asc' as const } } }

/**
 * Implementación Prisma del repositorio de Incidentes.
 *
 * Las sub-entidades normalizadas (afectados, historial) se escriben de forma
 * anidada. En `update` se sincronizan borrando y recreando dentro de una
 * transacción, lo que mantiene la consistencia del agregado con código simple.
 */
export class PrismaIncidentRepository implements IIncidentRepository {
  async save(incident: Incident): Promise<void> {
    const s = incident.snapshot
    await prisma.incident.create({
      data: {
        ...IncidentMapper.toScalarData(incident),
        affectedPeople: { create: s.affectedPeople.map(IncidentMapper.personToPersistence) },
        history: { create: s.history.map(IncidentMapper.historyToPersistence) },
      },
    })
  }

  async update(incident: Incident): Promise<void> {
    const s = incident.snapshot
    const { id, ...scalar } = IncidentMapper.toScalarData(incident)
    void id // se usa en el where, no en el data

    await prisma.$transaction([
      prisma.affectedPerson.deleteMany({ where: { incidentId: s.id } }),
      prisma.historyEntry.deleteMany({ where: { incidentId: s.id } }),
      prisma.incident.update({
        where: { id: s.id },
        data: {
          ...scalar,
          affectedPeople: { create: s.affectedPeople.map(IncidentMapper.personToPersistence) },
          history: { create: s.history.map(IncidentMapper.historyToPersistence) },
        },
      }),
    ])
  }

  async findById(id: string): Promise<Incident | null> {
    const row = await prisma.incident.findUnique({ where: { id }, include: INCLUDE })
    return row ? IncidentMapper.toDomain(row) : null
  }

  async findAll(filter?: IncidentFilter): Promise<Incident[]> {
    const rows = await prisma.incident.findMany({
      where: {
        status: filter?.status,
        category: filter?.category,
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { id: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    })

    let incidents = rows.map(IncidentMapper.toDomain)

    // El brigadista asignado vive en una columna jsonb (snapshot); se filtra en memoria.
    if (filter?.brigadistaId) {
      incidents = incidents.filter(
        (i) =>
          i.snapshot.brigadistaAsignado?.id === filter.brigadistaId ||
          (i.snapshot.brigadistasSeguimiento ?? []).some((b) => b.id === filter.brigadistaId),
      )
    }
    return incidents
  }

  async nextCorrelativo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `GRD-${year}-`
    const count = await prisma.incident.count({ where: { id: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }
}
