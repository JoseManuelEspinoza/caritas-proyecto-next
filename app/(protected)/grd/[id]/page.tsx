import { notFound } from "next/navigation";
import { IncidentDetail } from "@/app/ui/grd/incident-detail";
import { cargarDetalleIncidencia } from "@/app/lib/grd/cargar-detalle";

export default async function IncidentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await cargarDetalleIncidencia(id);
  if (!data) notFound();
  return <IncidentDetail data={data} />;
}
