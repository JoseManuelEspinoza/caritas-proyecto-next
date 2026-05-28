import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'
import { redirect } from 'next/navigation'
import { IncidentForm } from '@/app/ui/grd/incident-form'

export default async function NuevoIncidentePage() {
  const session = await verifySession()
  const role = toFrontendRole(session.role)

  if (role === 'brigadista' || role === 'comite') {
    redirect('/grd')
  }

  return <IncidentForm />
}
