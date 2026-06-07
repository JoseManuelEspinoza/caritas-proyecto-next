import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { DonacionesModule } from "@/app/ui/donaciones/DonacionesModule";

export default async function DonacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const canEvaluate = session.role === "COMITEDONACIONES" || session.role === "ADMINISTRADOR";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--caritas-bg-light)" }}>
      <DonacionesModule canEvaluate={canEvaluate} currentUser={session.userId as string} />
    </div>
  );
}
