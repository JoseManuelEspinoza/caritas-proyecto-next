import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { DashboardShell } from '@/app/ui/dashboard/shell'
import { toFrontendRole } from '@/app/lib/roles'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  })

  const frontendRole = toFrontendRole(session.role)

  return (
    <DashboardShell
      userName={user?.name ?? 'Usuario'}
      userEmail={user?.email ?? ''}
      userRole={session.role}
      frontendRole={frontendRole}
    >
      {children}
    </DashboardShell>
  )
}
