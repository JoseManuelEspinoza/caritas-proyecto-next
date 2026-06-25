import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole, ROLE_COLORS, ROLE_DISPLAY_NAMES } from "@/app/lib/roles";
import { AdminDashboard } from "@/app/ui/dashboard/admin-dashboard";
import { EspecialistaDashboard } from "@/app/ui/dashboard/especialista-dashboard";

const INACTIVE = ["CERRADO", "RECHAZADO"];

// "Este año" = año calendario actual. El dashboard separa lo del año en curso
// del histórico acumulado (incidentes), mientras que usuarios/equipo es padrón actual.
const ANIO = new Date().getFullYear();
const INICIO_ANIO = new Date(ANIO, 0, 1);
const esteAnio = { gte: INICIO_ANIO };

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
    incidentes2026,
    familias2026,
    personas2026,
    incidentesRecientes,
    simPendientes,
    incidentesPorTipo2026,
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
    // ── Métricas del año en curso ──
    prisma.incidencia.count({ where: { deletedAt: null, createdAt: esteAnio } }),
    prisma.grupoFamiliarAfectado.count({
      where: { incidencia: { deletedAt: null, createdAt: esteAnio } },
    }),
    prisma.personaAfectada.count({
      where: { grupoFamiliar: { incidencia: { deletedAt: null, createdAt: esteAnio } } },
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
        createdAt: true,
        parroquia: { select: { nombre: true } },
      },
    }),
    prisma.actividadPreventiva.count({
      where: { estadoActividad: { in: ["PROGRAMADA", "EN_EJECUCION"] }, deletedAt: null },
    }),
    // Categorías SOLO del año en curso
    prisma.incidencia.groupBy({
      by: ["tipoEvento"],
      _count: { idIncidencia: true },
      where: { deletedAt: null, tipoEvento: { not: null }, createdAt: esteAnio },
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

  const catData = incidentesPorTipo2026
    .filter((r) => r.tipoEvento)
    .map((r) => ({ name: r.tipoEvento!, count: r._count.idIncidencia }))
    .sort((a, b) => b.count - a.count);

  const roleData = usuariosPorRol.map((r) => ({
    name: ROLE_DISPLAY_NAMES[r.role] ?? r.role,
    value: r._count.id,
    fill: ROLE_COLORS[r.role] ?? "#6B7280",
  }));

  return {
    anio: ANIO,
    incidentesActivos,
    incidentesCerrados,
    totalIncidentes: incidentesActivos + incidentesCerrados,
    incidentes2026,
    familias2026,
    personas2026,
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
      fecha: i.createdAt.toISOString(),
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
    incidentes2026,
    familias2026,
    personas2026,
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
    prisma.incidencia.count({ where: { deletedAt: null, createdAt: esteAnio } }),
    prisma.grupoFamiliarAfectado.count({
      where: { incidencia: { deletedAt: null, createdAt: esteAnio } },
    }),
    prisma.personaAfectada.count({
      where: { grupoFamiliar: { incidencia: { deletedAt: null, createdAt: esteAnio } } },
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
        createdAt: true,
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
    fecha: i.createdAt.toISOString(),
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
    anio: ANIO,
    incidentesActivos,
    incidentes2026,
    familias2026,
    personas2026,
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

  // Comité → va a su módulo de donaciones
  if (role === "comite") redirect("/donaciones");

  if (role === "admin") {
    const data = await getAdminData();
    return <AdminDashboard {...data} />;
  }

  if (role === "especialistaGRD" || role === "jefaOGP") {
    const [data, user] = await Promise.all([
      getEspecialistaData(),
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    ]);
    return <EspecialistaDashboard {...data} userName={user?.name ?? session.name} />;
  }

  redirect("/grd");
}
