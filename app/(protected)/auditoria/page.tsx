import { History } from "lucide-react";
import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { getAuditEntries } from "@/app/actions/auditoria";
import { AuditoriaTable } from "@/app/ui/auditoria/auditoria-table";

export default async function AuditoriaPage() {
  const session = await verifySession();
  if (toFrontendRole(session.role) !== "admin") redirect("/dashboard");

  const entries = await getAuditEntries();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#009850]/10 rounded-lg flex items-center justify-center">
          <History className="w-5 h-5 text-[#009850]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Auditoría / Trazabilidad</h1>
          <p className="text-sm text-gray-500">Historial completo de acciones del sistema</p>
        </div>
      </div>

      <AuditoriaTable entries={entries} />
    </div>
  );
}
