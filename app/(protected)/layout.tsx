import { verifySession } from "@/app/lib/dal";
import { DashboardShell } from "@/app/ui/dashboard/shell";
import { toFrontendRole } from "@/app/lib/roles";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // nombre/email/rol vienen del token (sin consulta extra a la BD por navegación)
  const session = await verifySession();

  return (
    <DashboardShell
      userName={session.name}
      userEmail={session.email}
      userRole={session.role}
      frontendRole={toFrontendRole(session.role)}
    >
      {children}
    </DashboardShell>
  );
}
