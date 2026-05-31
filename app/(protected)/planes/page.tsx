import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { makePlanUseCases } from '@/core/infrastructure/factories/makePlanUseCases'
import { PlanesModule } from '@/app/ui/planes/planes-module'

export default async function PlanesPage() {
  const session = await verifySession()
  if (toFrontendRole(session.role) !== 'admin') redirect('/dashboard')

  const [planes, parroquias] = await Promise.all([
    makePlanUseCases().listar.execute(),
    prisma.parroquia.findMany({ where: { estado: 'ACTIVO' }, orderBy: { nombre: 'asc' }, select: { idParroquia: true, nombre: true } }),
  ])

  const parroquiaNombre = new Map(parroquias.map((p) => [p.idParroquia, p.nombre]))

  return (
    <PlanesModule
      planes={planes.map((p) => ({ ...p, parroquiaNombre: parroquiaNombre.get(p.idParroquia) ?? '—' }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
    />
  )
}
