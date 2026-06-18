import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { DonacionesModule } from "@/app/ui/donaciones/DonacionesModule";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";

export default async function DonacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const canEvaluate = session.role === "COMITEDONACIONES" || session.role === "ADMINISTRADOR";
  const soyMiembroDelComite = session.role === "COMITEDONACIONES";
  const miIdUsuarioGRD = await getUsuarioGRDId();

  // DonacionesModule (PascalCase) works with mock incident-data, not real DB cases.
  // There are no real idIncidencia values here, so tallyPorCaso is empty.
  const tallyPorCaso: Record<string, null> = {};

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--caritas-bg-light)" }}>
      <DonacionesModule
        canEvaluate={canEvaluate}
        currentUser={session.userId as string}
        soyMiembroDelComite={soyMiembroDelComite}
        miIdUsuarioGRD={miIdUsuarioGRD}
        tallyPorCaso={tallyPorCaso}
      />
    </div>
  );
}
