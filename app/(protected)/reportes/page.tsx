import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/prisma";
import { ReportesModule } from "@/app/ui/reportes/reportes-module";

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string };
}) {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  // 1. Manejo de Filtros de Fecha (RF100, RF104)
  // Por defecto muestra los últimos 30 días si no se selecciona nada
  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setMonth(hoy.getMonth() - 1);

  // Compatibilidad con Next.js 14 y 15 (searchParams puede ser asíncrono en v15)
  const params = await searchParams; 
  const desde = params?.desde ? new Date(params.desde) : haceUnMes;
  const hasta = params?.hasta ? new Date(params.hasta) : hoy;
  
  // Ajustamos 'hasta' para incluir todo el día hasta las 23:59:59
  hasta.setHours(23, 59, 59, 999);
  const filtroFecha = { gte: desde, lte: hasta };

  // 2. Consultas a la Base de Datos (Paralelizadas para máxima velocidad)
  const [
    // Incidencias filtradas por fecha
    totalIncidencias,
    incidenciasList,
    estadoGroups,
    tipoGroups,
    
    // Indicadores globales (RF98, RF99, RF102, RF103)
    totalBrigadistas,
    brigadistasCapacitados,
    totalParroquias,
    parroquiasConPlanAprobado,
    totalActividades,
    actividadesEjecutadas,
    movimientosKitsEntregados
  ] = await Promise.all([
    // Incidencias
    prisma.incidencia.count({ where: { fechaRegistro: filtroFecha } }),
    prisma.incidencia.findMany({ 
      where: { fechaRegistro: filtroFecha },
      include: { parroquia: true, usuarioResponsable: true },
      orderBy: { fechaRegistro: 'desc' }
    }),
    prisma.incidencia.groupBy({ by: ["estadoActual"], where: { fechaRegistro: filtroFecha }, _count: { _all: true } }),
    prisma.incidencia.groupBy({ by: ["tipoEvento"], where: { fechaRegistro: filtroFecha }, _count: { _all: true } }),
    
    // KPIs Generales
    prisma.brigadistaParroquial.count(),
    prisma.brigadistaParroquial.count({ where: { idCertificacionCurso: { not: null } } }), // RF98
    
    prisma.parroquia.count(),
    prisma.parroquia.count({ where: { planesTrabajo: { some: { estadoAprobacion: "APROBADO" } } } }), // RF99
    
    prisma.actividadPreventiva.count(),
    prisma.actividadPreventiva.count({ where: { estadoActividad: "EJECUTADA" } }), // RF103

    prisma.movimientoKit.aggregate({ 
      where: { tipoMovimiento: "SALIDA" }, 
      _sum: { cantidad: true } 
    }) // RF102 (Salidas de almacén)
  ]);

  // 3. Formateo de Datos para Recharts
  const porEstado = estadoGroups.map((g) => ({ label: g.estadoActual || "Sin estado", value: g._count._all }));
  const porTipo = tipoGroups
    .filter((g) => g.tipoEvento)
    .map((g) => ({ label: g.tipoEvento as string, value: g._count._all }));

  // 4. Formateo de Tabla de Exportación (RF35)
  const dataExportacion = incidenciasList.map(inc => ({
    Codigo: inc.codigoCaso || "-",
    Fecha: inc.fechaRegistro.toLocaleDateString(),
    Tipo: inc.tipoEvento || "-",
    Gravedad: inc.gravedad || "-",
    Estado: inc.estadoActual,
    Parroquia: inc.parroquia?.nombre || "No asignada",
    Ubicacion: inc.direccionEvento || "-"
  }));

  return (
    <ReportesModule
      filtros={{ desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0] }}
      totales={{
        incidencias: totalIncidencias,
        pctBrigadistasCapacitados: totalBrigadistas > 0 ? Math.round((brigadistasCapacitados / totalBrigadistas) * 100) : 0,
        pctParroquiasPlan: totalParroquias > 0 ? Math.round((parroquiasConPlanAprobado / totalParroquias) * 100) : 0,
        pctActividadesEjecutadas: totalActividades > 0 ? Math.round((actividadesEjecutadas / totalActividades) * 100) : 0,
        kitsEntregados: movimientosKitsEntregados._sum.cantidad || 0
      }}
      porEstado={porEstado}
      porTipo={porTipo}
      dataExportacion={dataExportacion}
    />
  );
}