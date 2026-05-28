import { verifySession } from "@/app/lib/dal";
import { DonacionesModule } from "@/app/ui/donaciones/DonacionesModule";

export default async function DonacionesPage() {
  const session = await verifySession();

  const canEvaluate =
    session.role === "COMITEDONACIONES" || session.role === "ADMINISTRADOR";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--caritas-bg-light)" }}
    >
      <DonacionesModule
        canEvaluate={canEvaluate}
        currentUser={session.userId as string}
      />
    </div>
  );
}
