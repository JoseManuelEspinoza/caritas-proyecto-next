import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'
import { redirect } from 'next/navigation'
import { makeCursoUseCases } from '@/core/infrastructure/factories/makeCursoUseCases'
import { CapacitacionesModule } from '@/app/ui/capacitaciones/capacitaciones-module'

export default async function CapacitacionesPage() {
  const session = await verifySession()
  const role = toFrontendRole(session.role)
  if (!['admin', 'especialistaGRD', 'brigadista'].includes(role)) redirect('/dashboard')

  const cursos = await makeCursoUseCases().listar.execute()

  return <CapacitacionesModule cursos={cursos} />
}
