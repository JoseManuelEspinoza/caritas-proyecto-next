/**
 * Verificación E2E del flujo de Incidencias contra la BD real, ejecutando los
 * casos de uso de core/ (mismo código que usan las server actions).
 * Ejecutar: docker compose exec web npx tsx prisma/verify-grd.ts
 */
import { prisma } from "../app/lib/prisma";
import { makeIncidenciaUseCases } from "../core/infrastructure/factories/makeIncidenciaUseCases";

const uc = makeIncidenciaUseCases();

async function estado(id: string): Promise<string> {
  const i = await prisma.incidencia.findUnique({
    where: { idIncidencia: id },
    select: { estadoActual: true },
  });
  return i?.estadoActual ?? "(no existe)";
}

let pasos = 0;
let ok = 0;
async function check(label: string, id: string, esperado: string) {
  pasos++;
  const e = await estado(id);
  const bien = e === esperado;
  if (bien) ok++;
  console.log(
    `${bien ? "✅" : "❌"}  ${label}: estado = ${e}${bien ? "" : ` (esperaba ${esperado})`}`
  );
}

async function main() {
  console.log("\n=== Verificación E2E flujo GRD ===\n");

  // 1. Registrar incidente
  const id = await uc.registrar.execute({
    reportaDni: "47823456",
    reportaNombre: "Juan Pérez",
    reportaTel: "987654321",
    reportaRol: "Vecino",
    fechaReporte: "2026-05-30",
    fechaSuceso: "2026-05-29",
    horaSuceso: "14:30",
    categoria: "Incendio",
    pais: "Perú",
    region: "Lima",
    distrito: "San Juan de Lurigancho",
    parroquia: "Parroquia San Juan Bautista",
    direccion: "Av. Los Jardines 456",
    referencia: "Frente al mercado",
    descripcion: "Incendio en edificio multifamiliar",
    causa: "Cortocircuito",
    familias: [{ id: "f1", nombre: "Familia Pérez" }],
    personas: [
      {
        id: "p1",
        tipoDoc: "DNI",
        dni: "12345678",
        nombre: "Ana",
        apellidoPaterno: "Pérez",
        apellidoMaterno: "Soto",
        edad: "34",
        genero: "Femenino",
        celular: "999",
        parentesco: "Madre",
        situacionActual: "Gestante",
        familiaId: "f1",
      },
    ],
    necesidades: ["Refugio temporal", "Alimentación"],
    necesidadOtra: "",
    necesidadesObs: "Urgente",
    nivelAfectacion: "Severo",
  });
  console.log(`📝 Incidente creado: ${id}`);
  await check("Registro", id, "ABIERTO");

  // 2. Asignar brigadista
  const brig = await prisma.brigadistaParroquial.findFirst({
    select: { idBrigadistaParroquial: true },
  });
  if (!brig) throw new Error("No hay brigadistas. Corre el seed primero.");
  await uc.asignar.execute(id, brig.idBrigadistaParroquial);
  await check("Asignar brigadista", id, "ASIGNADO");

  // 3. Levantamiento de campo
  await uc.registrarCampo.execute(
    id,
    {
      fechaVisita: "2026-05-29",
      responsable: "Tester",
      descripcionEvento: "Daño severo",
      nivelVulnerabilidad: "Alto",
      necesidadesPrioritarias: ["Refugio"],
      recomendacion: "Apoyo urgente",
      condHabitabilidad: {
        agua: false,
        electricidad: false,
        refugio: false,
        saludAmbiental: false,
        acceso: true,
      },
    },
    "Tester"
  );
  await check("Levantamiento campo", id, "DATA RECOPILADA");

  // 4. Informe de evaluación
  await uc.generarInforme.execute(
    id,
    {
      analisisSituacion: "Alta vulnerabilidad",
      hallazgosTexto: "Sin techo",
      conclusiones: "Intervenir",
      nivelUrgencia: "Inmediata",
      tipoIntervencion: "Donación en especie",
      recomendacionComite: "Aprobar",
    },
    "Tester"
  );
  await check("Informe evaluación", id, "EN EVALUACION");

  // 5. Decisión del Comité — aprobar
  await uc.decisionComite.execute(id, "APROBAR", "Aprobado por urgencia");
  await check("Comité aprueba", id, "APROBADO");

  // 6. Registrar atención
  await uc.registrarAtencion.execute(id, {
    tipoAyuda: "Kit de víveres",
    descripcionAyuda: "Entrega de víveres",
    lugarEntrega: "Domicilio",
  });
  await check("Atención", id, "ATENDIDO");

  // 7. Seguimiento
  await uc.agregarSeguimiento.execute(id, {
    situacion: "Mejoró",
    descripcion: "Familia reubicada",
  });
  await check("Seguimiento", id, "SEGUIMIENTO ABIERTO");

  // 8. Cerrar
  await uc.cerrar.execute(id);
  await check("Cierre", id, "CERRADO");

  // Verificar registros relacionados
  const [informes, solicitudes, entregas, seguimientos, historial, personas] = await Promise.all([
    prisma.informe.count({ where: { idIncidencia: id } }),
    prisma.solicitudAyudaHumanitaria.count({ where: { idIncidencia: id } }),
    prisma.entregaAyudaHumanitaria.count({ where: { idIncidencia: id } }),
    prisma.seguimientoIncidencia.count({ where: { idIncidencia: id } }),
    prisma.historialEstadoIncidencia.count({ where: { idIncidencia: id } }),
    prisma.personaAfectada.count({ where: { grupoFamiliar: { idIncidencia: id } } }),
  ]);
  console.log("\n--- Registros relacionados ---");
  console.log(
    `   Informes: ${informes} · Solicitudes: ${solicitudes} · Entregas: ${entregas} · Seguimientos: ${seguimientos} · Historial: ${historial} · Personas: ${personas}`
  );

  console.log(
    `\n${ok === pasos ? "🎉 TODO OK" : "⚠️  HUBO FALLOS"} — ${ok}/${pasos} transiciones correctas\n`
  );
  process.exit(ok === pasos ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("💥", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
