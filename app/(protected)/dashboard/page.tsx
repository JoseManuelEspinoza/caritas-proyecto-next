import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole, ROLE_COLORS, ROLE_DISPLAY_NAMES } from "@/app/lib/roles";
import { AdminDashboard } from "@/app/ui/dashboard/admin-dashboard";
import { EspecialistaDashboard } from "@/app/ui/dashboard/especialista-dashboard";

const INACTIVE = ["CERRADO", "RECHAZADO"];

async function getAdminData() {
  const [
    porEstado,
    usuariosPorRol,
    totalBrig,
    brigDisp,
    usersActivos,
    totalUsers,
    familias,
    personas,
    incidentesRecientes,
    simPendientes,
    incidentesPorTipo,
  ] = await Promise.all([
    prisma.incidencia.groupBy({
      by: ["estadoActual"],
      _count: { idIncidencia: true },
      where: { deletedAt: null },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO" } }),
    prisma.brigadistaParroquial.count({
      where: { estado: "ACTIVO", disponibilidad: "DISPONIBLE" },
    }),
    prisma.user.count({ where: { estado: "ACTIVO" } }),
    prisma.user.count(),
    prisma.grupoFamiliarAfectado.count({
      where: { incidencia: { estadoActual: { notIn: INACTIVE }, deletedAt: null } },
    }),
    prisma.personaAfectada.count({
      where: {
        grupoFamiliar: { incidencia: { estadoActual: { notIn: INACTIVE }, deletedAt: null } },
      },
    }),
    prisma.incidencia.findMany({
      where: { estadoActual: { notIn: INACTIVE }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        idIncidencia: true,
        codigoCaso: true,
        tituloIncidencia: true,
        tipoEvento: true,
        estadoActual: true,
        parroquia: { select: { nombre: true } },
      },
    }),
    prisma.actividadPreventiva.count({
      where: { estadoActividad: { in: ["PROGRAMADA", "EN_EJECUCION"] }, deletedAt: null },
    }),
    prisma.incidencia.groupBy({
      by: ["tipoEvento"],
      _count: { idIncidencia: true },
      where: { deletedAt: null, tipoEvento: { not: null } },
    }),
  ]);

  const pipelineCounts: Record<string, number> = {};
  let incidentesActivos = 0;
  let incidentesCerrados = 0;
  for (const row of porEstado) {
    pipelineCounts[row.estadoActual] = row._count.idIncidencia;
    if (INACTIVE.includes(row.estadoActual)) incidentesCerrados += row._count.idIncidencia;
    else incidentesActivos += row._count.idIncidencia;
  }

  const catData = incidentesPorTipo
    .filter((r) => r.tipoEvento)
    .map((r) => ({ name: r.tipoEvento!, count: r._count.idIncidencia }))
    .sort((a, b) => b.count - a.count);

  const roleData = usuariosPorRol.map((r) => ({
    name: ROLE_DISPLAY_NAMES[r.role] ?? r.role,
    value: r._count.id,
    fill: ROLE_COLORS[r.role] ?? "#6B7280",
  }));

  return {
    incidentesActivos,
    incidentesCerrados,
    totalIncidentes: incidentesActivos + incidentesCerrados,
    familias,
    personas,
    usersActivos,
    totalUsers,
    brigDisp,
    totalBrig,
    simPendientes,
    pipelineCounts,
    incidentesRecientes: incidentesRecientes.map((i) => ({
      id: i.idIncidencia,
      codigoCaso: i.codigoCaso,
      tituloIncidencia: i.tituloIncidencia,
      tipoEvento: i.tipoEvento,
      estadoActual: i.estadoActual,
      parroquia: i.parroquia?.nombre ?? null,
    })),
    catData,
    roleData,
  };
}

async function getEspecialistaData() {
  const [
    porEstado,
    totalBrigActivos,
    brigDispList,
    familias,
    personas,
    incidentesRecientes,
    simulacrosActivos,
  ] = await Promise.all([
    prisma.incidencia.groupBy({
      by: ["estadoActual"],
      _count: { idIncidencia: true },
      where: { deletedAt: null },
    }),
    prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO" } }),
    prisma.brigadistaParroquial.findMany({
      where: { estado: "ACTIVO", disponibilidad: "DISPONIBLE" },
      select: {
        idBrigadistaParroquial: true,
        nombres: true,
        apellidos: true,
        parroquia: { select: { nombre: true } },
      },
      take: 10,
    }),
    prisma.grupoFamiliarAfectado.count({
      where: { incidencia: { estadoActual: { notIn: INACTIVE }, deletedAt: null } },
    }),
    prisma.personaAfectada.count({
      where: {
        grupoFamiliar: { incidencia: { estadoActual: { notIn: INACTIVE }, deletedAt: null } },
      },
    }),
    prisma.incidencia.findMany({
      where: { estadoActual: { notIn: INACTIVE }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        idIncidencia: true,
        codigoCaso: true,
        tituloIncidencia: true,
        tipoEvento: true,
        estadoActual: true,
        parroquia: { select: { nombre: true } },
      },
    }),
    prisma.actividadPreventiva.findMany({
      where: { estadoActividad: { in: ["PROGRAMADA", "EN_EJECUCION"] }, deletedAt: null },
      take: 4,
      select: {
        idActividadPreventiva: true,
        nombreActividad: true,
        estadoActividad: true,
        parroquia: { select: { nombre: true } },
      },
    }),
  ]);

  const pipelineCounts: Record<string, number> = {};
  let incidentesActivos = 0;
  for (const row of porEstado) {
    pipelineCounts[row.estadoActual] = row._count.idIncidencia;
    if (!INACTIVE.includes(row.estadoActual)) incidentesActivos += row._count.idIncidencia;
  }

  const mapped = incidentesRecientes.map((i) => ({
    id: i.idIncidencia,
    codigoCaso: i.codigoCaso,
    tituloIncidencia: i.tituloIncidencia,
    tipoEvento: i.tipoEvento,
    estadoActual: i.estadoActual,
    parroquia: i.parroquia?.nombre ?? null,
  }));

  const URGENTE_MAP: Record<string, { label: string; color: string }> = {
    ABIERTO: { label: "Asignar", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
    "DATA RECOPILADA": {
      label: "Evaluar",
      color: "bg-orange-50 border-orange-200 text-orange-800",
    },
    OBSERVADO: { label: "Corregir", color: "bg-amber-50 border-amber-200 text-amber-800" },
    APROBADO: { label: "Atender", color: "bg-green-50 border-green-200 text-green-800" },
  };
  const urgentes = mapped
    .filter((i) => URGENTE_MAP[i.estadoActual])
    .map((inc) => ({ inc, ...URGENTE_MAP[inc.estadoActual] }));

  return {
    incidentesActivos,
    familias,
    personas,
    brigDisp: brigDispList.length,
    totalBrigActivos,
    pipelineCounts,
    urgentes,
    brigadistasDisponibles: brigDispList.map((b) => ({
      id: b.idBrigadistaParroquial,
      nombres: b.nombres,
      apellidos: b.apellidos,
      parroquia: b.parroquia?.nombre ?? null,
    })),
    incidentesRecientes: mapped,
    simulacrosActivos: simulacrosActivos.map((s) => ({
      id: s.idActividadPreventiva,
      nombreActividad: s.nombreActividad,
      parroquia: s.parroquia?.nombre ?? null,
      estadoActividad: s.estadoActividad,
    })),
  };
}

export default async function DashboardPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  // Brigadista → va directo a GRD
  if (role === "brigadista") redirect("/grd");

  // Comité y Jefa OGP → van a GRD también
  if (role === "comite" || role === "jefaOGP") redirect("/grd");

  if (role === "admin") {
    const data = await getAdminData();
    return <AdminDashboard {...data} />;
  }

  if (role === "especialistaGRD") {
    const [data, user] = await Promise.all([
      getEspecialistaData(),
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    ]);
    return <EspecialistaDashboard {...data} userName={user?.name ?? "Especialista"} />;
  }

  redirect("/grd");
}
