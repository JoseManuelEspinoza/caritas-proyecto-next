import { notFound } from "next/navigation";
import { obtenerDatosConstancia } from "@/app/actions/capacitaciones";
import { ConstanciaViewer } from "./ConstanciaViewer";

export default async function ConstanciaPage({
  params,
}: {
  params: Promise<{ idInscripcion: string }>;
}) {
  const { idInscripcion } = await params;
  const datos = await obtenerDatosConstancia(idInscripcion);
  if (!datos) notFound();

  return <ConstanciaViewer datos={datos} />;
}
