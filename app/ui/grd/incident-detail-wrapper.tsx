"use client";

import dynamic from "next/dynamic";
import type { IncidenciaDetalleOutput as IncidentData } from "@/core/application/dtos/IncidenciaDetalleDTO";

// ssr: false eliminates hydration mismatches from browser extensions
// (password managers inject fdprocessedid onto buttons/inputs)
const IncidentDetailClient = dynamic(
  () => import("./incident-detail").then((m) => ({ default: m.IncidentDetail })),
  { ssr: false }
);

export function IncidentDetailWrapper({ data }: { data: IncidentData }) {
  return <IncidentDetailClient data={data} />;
}
