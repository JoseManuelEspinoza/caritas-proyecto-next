/**
 * MEGASEED — puebla todos los módulos GRD usando los CASOS DE USO del core/,
 * de modo que los datos sean coherentes con el flujo real (historial,
 * solicitudes, entregas, certificaciones se generan por las reglas, no a mano).
 *
 * Requisitos: corre primero `npm run seed` (parroquias, usuarios, catálogos, kits).
 * Ejecutar: docker compose exec web npx tsx prisma/megaseed.ts
 * Es idempotente por conteo: si ya hay datos sembrados, no duplica.
 */
import { prisma } from "../app/lib/prisma";
import { makeIncidenciaUseCases } from "../core/infrastructure/factories/makeIncidenciaUseCases";
import { makePlanUseCases } from "../core/infrastructure/factories/makePlanUseCases";
import { makeActividadUseCases } from "../core/infrastructure/factories/makeActividadUseCases";
import { makeCursoUseCases } from "../core/infrastructure/factories/makeCursoUseCases";
import type { CreateIncidenteData } from "../core/application/dtos/IncidenciaDTO";
import "dotenv/config";
const inc = makeIncidenciaUseCases();
const plan = makePlanUseCases();
const act = makeActividadUseCases();
const curso = makeCursoUseCases(); 
const TARGETS = {
  parroquias: 8,
  brigadistas: 160,
  incidencias: 40,
  gruposFamiliares: 50,
  personasAfectadas: 180,
  kits: 8,
  movimientosKit: 45,
  planes: 10,
  actividades: 20,
  cursos: 6,
  inscripciones: 80,
  progresos: 50,
  evidencias: 30,
  observaciones: 30,
  auditorias: 30,
  historialEstados: 100,
};
const infoCampo = (responsable: string) => ({
  fechaVisita: "2026-05-20",
  responsable,
  descripcionEvento: "Daño verificado en campo",
  nivelVulnerabilidad: "Alto",
  necesidadesPrioritarias: ["Refugio", "Alimentación"],
  recomendacion: "Asistencia humanitaria urgente",
  observaciones: "Familia sin red de apoyo",
  condHabitabilidad: {
    agua: false,
    electricidad: true,
    refugio: false,
    saludAmbiental: false,
    acceso: true,
  },
});
const informeEval = {
  analisisSituacion: "Familia en alta vulnerabilidad tras el evento.",
  hallazgosTexto: "Pérdida de enseres y techo; presencia de gestante.",
  conclusiones: "Se recomienda intervención con kit de víveres y abrigo.",
  nivelUrgencia: "Inmediata",
  tipoIntervencion: "Donación en especie",
  recomendacionComite: "Aprobar por urgencia.",
};

function incidenteData(over: Partial<CreateIncidenteData>): CreateIncidenteData {
  return {
    reportaDni: "47823456",
    reportaNombre: "Vecino Informante",
    reportaTel: "987654321",
    reportaRol: "Comunidad / Vecinos",
    fechaReporte: "2026-05-20",
    fechaSuceso: "2026-05-19",
    horaSuceso: "15:00",
    categoria: "Incendio",
    pais: "Perú",
    region: "Lima Metropolitana",
    distrito: "San Juan de Lurigancho",
    parroquia: "",
    direccion: "Av. Ejemplo 100",
    referencia: "Cerca al mercado",
    descripcion: "Evento con familias afectadas",
    causa: "Causa estimada",
    familias: [{ id: "f1", nombre: "Familia Afectada" }],
    personas: [
      {
        id: "p1",
        tipoDoc: "DNI",
        dni: "12345678",
        nombre: "María",
        apellidoPaterno: "García",
        apellidoMaterno: "Luna",
        edad: "30",
        genero: "Femenino",
        celular: "999888777",
        parentesco: "Madre",
        situacionActual: "Gestante",
        familiaId: "f1",
      },
    ],
    necesidades: ["Refugio temporal", "Alimentación"],
    necesidadOtra: "",
    necesidadesObs: "",
    nivelAfectacion: "Severo",
    ...over,
  };
}
async function ensureTipoReferencia(codigoEntidad: string, nombreEntidad: string) {
  return prisma.tipoReferencia.upsert({
    where: { codigoEntidad },
    update: {},
    create: {
      codigoEntidad,
      nombreEntidad,
      descripcion: `Referencia transversal para ${nombreEntidad}`,
      estado: "ACTIVO",
    },
  });
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function pad(n: number, size = 3) {
  return String(n).padStart(size, "0");
}

async function ensureDemoMasivo(idUsuarioGRD: string) {
  console.log("\n📊 Datos artificiales masivos para demo...");

  // 1. Parroquias
  const parroquiasDemo = [
    ["Parroquia Cristo Salvador", "Av. Central 112, Villa El Salvador"],
    ["Parroquia El Buen Pastor", "Jr. Los Cedros 450, Comas"],
    ["Parroquia San Martín de Porres", "Av. Perú 220, SMP"],
    ["Parroquia Nuestra Señora de la Paz", "Calle Lima 310, Ate"],
    ["Parroquia San José Obrero", "Av. Industrial 875, San Juan de Miraflores"],
  ];

  for (const [nombre, direccion] of parroquiasDemo) {
    const count = await prisma.parroquia.count();
    if (count >= TARGETS.parroquias) break;

    const exists = await prisma.parroquia.findFirst({ where: { nombre } });
    if (!exists) {
      await prisma.parroquia.create({
        data: {
          nombre,
          direccion,
          referencia: "Zona pastoral asignada para pruebas GRD",
          telefono: "01-5550000",
          correo: `${nombre.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@caritas.pe`,
          estado: "ACTIVO",
        },
      });
    }
  }

  const parroquias = await prisma.parroquia.findMany({
    select: { idParroquia: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  // 2. Brigadistas
  const nombres = [
    "Ana",
    "Carlos",
    "Luis",
    "Rosa",
    "María",
    "Pedro",
    "Lucía",
    "Jorge",
    "Elena",
    "Miguel",
    "Carmen",
    "Diego",
    "Patricia",
    "Sofía",
    "Raúl",
    "Verónica",
  ];
  const apellidos = [
    "Torres Quispe",
    "Mendoza Silva",
    "Ramírez Pérez",
    "Quispe Mamani",
    "Flores García",
    "Salas Rojas",
    "Vargas Huamán",
    "Castro León",
    "Rojas Díaz",
    "Huamán Vega",
  ];

  const nBrig = await prisma.brigadistaParroquial.count();
  for (let i = nBrig; i < TARGETS.brigadistas; i++) {
    const dni = `60${pad(i, 6)}`;
    const exists = await prisma.brigadistaParroquial.findFirst({ where: { dni } });
    if (exists) continue;

    await prisma.brigadistaParroquial.create({
      data: {
        idParroquia: pick(parroquias, i).idParroquia,
        dni,
        nombres: pick(nombres, i),
        // Apellido desacoplado del nombre (índice por bloques) → 16×10=160 combinaciones únicas, sin homónimos.
        apellidos: pick(apellidos, Math.floor(i / nombres.length)),
        celular: `9${String(10000000 + i).slice(0, 8)}`,
        correo: `brigadista.demo.${pad(i)}@caritas.pe`,
        disponibilidad: i % 5 === 0 ? "EN_CAMPO" : "DISPONIBLE",
        estado: i % 17 === 0 ? "INACTIVO" : "ACTIVO",
      },
    });
  }

  // 3. Kits
  const kitsDemo = [
    ["Kit de Abrigo", "Frazadas, casacas, medias térmicas", 35],
    ["Kit de Limpieza", "Lejía, detergente, escoba, recogedor", 28],
    ["Kit de Cocina Básica", "Ollas, platos, cubiertos, cocina portátil", 18],
    ["Kit de Botiquín Familiar", "Gasas, alcohol, vendas, analgésicos básicos", 22],
    ["Kit de Agua Segura", "Bidones, pastillas potabilizadoras, filtros", 30],
  ];

  for (const [tipoKit, descripcion, stockActual] of kitsDemo) {
    const count = await prisma.kitEmergencia.count();
    if (count >= TARGETS.kits) break;

    const exists = await prisma.kitEmergencia.findFirst({ where: { tipoKit: String(tipoKit) } });
    if (!exists) {
      await prisma.kitEmergencia.create({
        data: {
          tipoKit: String(tipoKit),
          descripcion: String(descripcion),
          stockActual: Number(stockActual),
          estadoKit: "ACTIVO",
          ubicacionAlmacen: "Almacén Central",
        },
      });
    }
  }

  const kits = await prisma.kitEmergencia.findMany({
    select: { idKitEmergencia: true, stockActual: true, tipoKit: true },
  });

  // 4. Incidencias adicionales
  const tiposEvento = ["Incendio", "Inundación", "Sismo", "Derrumbe", "Deslizamiento", "Vendaval"];
  const estados = [
    "ABIERTO",
    "ASIGNADO",
    "DATA RECOPILADA",
    "EN EVALUACION",
    "APROBADO",
    "ATENDIDO",
    "SEGUIMIENTO ABIERTO",
    "CERRADO",
    "RECHAZADO",
  ];
  const distritos = [
    "Comas",
    "Ate",
    "San Juan de Lurigancho",
    "Villa El Salvador",
    "San Martín de Porres",
    "El Agustino",
    "Puente Piedra",
    "Independencia",
  ];

  const nInc = await prisma.incidencia.count();
  for (let i = nInc; i < TARGETS.incidencias; i++) {
    const codigoCaso = `GRD-DEMO-${pad(i + 1, 4)}`;
    const exists = await prisma.incidencia.findFirst({ where: { codigoCaso } });
    if (exists) continue;

    const parroquia = pick(parroquias, i);
    const tipoEvento = pick(tiposEvento, i);
    const estadoActual = pick(estados, i);

    const incidencia = await prisma.incidencia.create({
      data: {
        idParroquia: parroquia.idParroquia,
        idUsuarioResponsableGRD: idUsuarioGRD,
        codigoCaso,
        tituloIncidencia: `${tipoEvento}-${distritos[i % distritos.length]}-${parroquia.nombre.replace("Parroquia ", "")}`,
        relatoActual: `Registro artificial de ${tipoEvento.toLowerCase()} para pruebas de carga y demo.`,
        direccionEvento: `Av. Demo ${100 + i}`,
        contextoCaso: "Caso generado para validación de base de datos principal.",
        tipoEvento,
        descripcionEvento: `Evento de tipo ${tipoEvento} con familias afectadas.`,
        gravedad: i % 3 === 0 ? "Severo" : i % 3 === 1 ? "Moderado" : "Leve",
        estadoActual,
        latitud: String(-12.04 - (i % 20) * 0.002),
        longitud: String(-77.03 - (i % 20) * 0.002),
        observacionesGenerales: "Datos sintéticos para entorno académico.",
        syncEstado: "SINCRONIZADO",
      },
    });

    await prisma.historialEstadoIncidencia.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        idUsuarioGRD,
        estadoAnterior: null,
        estadoNuevo: "ABIERTO",
        motivoCambio: "Registro inicial artificial",
      },
    });

    if (estadoActual !== "ABIERTO") {
      await prisma.historialEstadoIncidencia.create({
        data: {
          idIncidencia: incidencia.idIncidencia,
          idUsuarioGRD,
          estadoAnterior: "ABIERTO",
          estadoNuevo: estadoActual,
          motivoCambio: "Avance artificial del flujo para demo",
        },
      });
    }
  }

  const incidencias = await prisma.incidencia.findMany({
    select: { idIncidencia: true, estadoActual: true },
    orderBy: { fechaRegistro: "asc" },
  });

  // 5. Grupos familiares y personas afectadas
  const nGrupos = await prisma.grupoFamiliarAfectado.count();
  for (let i = nGrupos; i < TARGETS.gruposFamiliares; i++) {
    await prisma.grupoFamiliarAfectado.create({
      data: {
        idIncidencia: pick(incidencias, i).idIncidencia,
        codigoGrupo: `GF-DEMO-${pad(i + 1, 4)}`,
        nombreReferencia: `Familia Demo ${i + 1}`,
        direccion: `Pasaje Solidaridad ${i + 10}`,
        condicionVivienda: i % 2 === 0 ? "Daño parcial" : "Vivienda inhabitable",
        condicionFinal: i % 3 === 0 ? "Requiere apoyo urgente" : "En evaluación",
        observaciones: "Grupo familiar generado para prueba de empadronamiento.",
      },
    });
  }

  const grupos = await prisma.grupoFamiliarAfectado.findMany({
    select: { idGrupoFamiliar: true },
  });

  const sexos = ["Femenino", "Masculino"];
  const parentescos = ["Madre", "Padre", "Hijo/a", "Abuelo/a", "Titular", "Otro"];
  const nPersonas = await prisma.personaAfectada.count();
  for (let i = nPersonas; i < TARGETS.personasAfectadas; i++) {
    await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar: pick(grupos, i).idGrupoFamiliar,
        tipoDocumento: "DNI",
        numeroDocumento: `70${pad(i, 6)}`,
        nombres: pick(nombres, i),
        apellidos: pick(apellidos, i),
        sexo: pick(sexos, i),
        parentesco: pick(parentescos, i),
        condicionSalud:
          i % 7 === 0 ? "Requiere atención médica" : "Sin condición crítica registrada",
        condicionEspecial: i % 9 === 0 ? "Adulto mayor / discapacidad" : null,
        esVulnerable: i % 4 === 0,
        telefono: `9${String(20000000 + i).slice(0, 8)}`,
        observaciones: "Persona afectada generada para pruebas.",
      },
    });
  }

  // 6. Planes adicionales
  const nPlanes = await prisma.planTrabajoGRD.count();
  for (let i = nPlanes; i < TARGETS.planes; i++) {
    const codigoPlan = `PLAN-DEMO-${pad(i + 1, 4)}`;
    const exists = await prisma.planTrabajoGRD.findFirst({ where: { codigoPlan } });
    if (exists) continue;

    await prisma.planTrabajoGRD.create({
      data: {
        idParroquia: pick(parroquias, i).idParroquia,
        idUsuarioResponsableGRD: idUsuarioGRD,
        codigoPlan,
        nombrePlan: `Plan GRD Demo ${i + 1}`,
        diagnosticoRiesgo: "Riesgos priorizados: incendios, sismos e inundaciones.",
        objetivos: "Reducir vulnerabilidad comunitaria y fortalecer respuesta parroquial.",
        actividadesGenerales: "Capacitación, simulacros, revisión de rutas y preparación de kits.",
        fechaInicio: new Date(`2026-${pad((i % 9) + 1, 2)}-01`),
        fechaFin: new Date("2026-12-31"),
        rutasEvacuacion: "Rutas principales hacia punto seguro parroquial.",
        zonasSeguras: "Patio parroquial, losa deportiva y colegio cercano.",
        estadoAprobacion: i % 3 === 0 ? "APROBADO" : i % 3 === 1 ? "EN_REVISION" : "BORRADOR",
      },
    });
  }

  const planes = await prisma.planTrabajoGRD.findMany({
    select: { idPlanTrabajoGRD: true },
  });

  // 7. Actividades preventivas adicionales
  const nActividades = await prisma.actividadPreventiva.count();
  for (let i = nActividades; i < TARGETS.actividades; i++) {
    const codigoActividad = `ACT-DEMO-${pad(i + 1, 4)}`;
    const exists = await prisma.actividadPreventiva.findFirst({ where: { codigoActividad } });
    if (exists) continue;

    await prisma.actividadPreventiva.create({
      data: {
        idPlanTrabajoGRD: pick(planes, i).idPlanTrabajoGRD,
        idParroquia: pick(parroquias, i).idParroquia,
        idUsuarioRegistroGRD: idUsuarioGRD,
        idTipoActividadPreventiva: i % 2 === 0 ? "Simulacro" : "Charla preventiva",
        codigoActividad,
        nombreActividad:
          i % 2 === 0 ? `Simulacro comunitario ${i + 1}` : `Charla de prevención ${i + 1}`,
        fechaProgramada: new Date(`2026-${pad((i % 6) + 6, 2)}-${pad((i % 20) + 1, 2)}`),
        fechaEjecucion:
          i % 3 === 0 ? new Date(`2026-${pad((i % 6) + 6, 2)}-${pad((i % 20) + 1, 2)}`) : null,
        lugarActividad: "Local parroquial",
        publicoObjetivo: "Brigadistas y comunidad parroquial",
        numeroParticipantesEstimado: 40 + (i % 80),
        numeroParticipantesReal: i % 3 === 0 ? 30 + (i % 60) : null,
        descripcionActividad: "Actividad preventiva generada para pruebas.",
        resultadoGeneral: i % 3 === 0 ? "Actividad ejecutada sin incidentes." : null,
        recomendaciones: i % 3 === 0 ? "Reforzar señalización y comunicación." : null,
        estadoActividad: i % 3 === 0 ? "EJECUTADA" : "PROGRAMADA",
        syncEstado: "SINCRONIZADO",
      },
    });
  }

  const actividades = await prisma.actividadPreventiva.findMany({
    select: { idActividadPreventiva: true },
  });

  // 8. Movimientos de kit
  const nMov = await prisma.movimientoKit.count();
  for (let i = nMov; i < TARGETS.movimientosKit; i++) {
    const kit = pick(kits, i);
    await prisma.movimientoKit.create({
      data: {
        idKitEmergencia: kit.idKitEmergencia,
        idUsuarioResponsableGRD: idUsuarioGRD,
        idParroquiaDestino: pick(parroquias, i).idParroquia,
        idActividadPreventiva:
          i % 4 === 0 && actividades.length > 0 ? pick(actividades, i).idActividadPreventiva : null,
        tipoMovimiento: i % 3 === 0 ? "ENTRADA" : "SALIDA",
        cantidad: 1 + (i % 8),
        motivoMovimiento: i % 3 === 0 ? "Reposición de stock" : "Atención preventiva / emergencia",
        observaciones: "Movimiento generado para prueba logística.",
        syncEstado: "SINCRONIZADO",
      },
    });
  }

  // 9. Cursos adicionales
  const nCursos = await prisma.cursoCapacitacion.count();
  const cursosDemo = [
    ["Gestión de Riesgos Comunitarios", 10],
    ["Evaluación Rápida de Daños", 6],
    ["Manejo de Kits de Emergencia", 4],
    ["Comunicación en Emergencias", 5],
  ];

  for (let i = nCursos; i < TARGETS.cursos; i++) {
    const [nombreCurso, horas] = pick(cursosDemo, i);
    const codigoCurso = `CAP-DEMO-${pad(i + 1, 4)}`;
    const exists = await prisma.cursoCapacitacion.findFirst({ where: { codigoCurso } });
    if (exists) continue;

    const cursoCreado = await prisma.cursoCapacitacion.create({
      data: {
        idUsuarioResponsableGRD: idUsuarioGRD,
        codigoCurso,
        nombreCurso: `${nombreCurso} ${i + 1}`,
        descripcion: "Curso asincrónico generado para pruebas de capacitación.",
        fechaPublicacion: new Date(),
        duracionEstimadaHoras: Number(horas),
        modalidadGeneral: "ASINCRONA",
        estadoCurso: i % 4 === 0 ? "BORRADOR" : "PUBLICADO",
      },
    });

    for (let u = 1; u <= 3; u++) {
      const unidad = await prisma.unidadContenido.create({
        data: {
          idCursoCapacitacion: cursoCreado.idCursoCapacitacion,
          numeroOrden: u,
          tituloUnidad: `Unidad ${u}: Contenido base`,
          descripcion: "Unidad generada para curso demo.",
          duracionEstimadaMinutos: 45,
        },
      });

      await prisma.materialCapacitacion.create({
        data: {
          idCursoCapacitacion: cursoCreado.idCursoCapacitacion,
          idUnidadContenido: unidad.idUnidadContenido,
          titulo: `Material Unidad ${u}`,
          tipoMaterial: u % 2 === 0 ? "VIDEO" : "PDF",
          enlaceMaterial: `https://recursos.caritas.demo/curso-${i + 1}/unidad-${u}`,
          descripcion: "Material artificial para demostración.",
          categoria: "Capacitación GRD",
          fechaPublicacion: new Date(),
        },
      });
    }
  }

  const cursos = await prisma.cursoCapacitacion.findMany({
    select: { idCursoCapacitacion: true },
  });

  // 10. Participantes, inscripciones, evaluaciones, certificaciones y progreso
  const nIns = await prisma.inscripcionCurso.count();
  for (let i = nIns; i < TARGETS.inscripciones; i++) {
    const tipoDocumento = "DNI";
    const numeroDocumento = `80${pad(i, 6)}`;

    const participante = await prisma.participante.upsert({
      where: { tipoDocumento_numeroDocumento: { tipoDocumento, numeroDocumento } },
      update: {},
      create: {
        idParroquia: pick(parroquias, i).idParroquia,
        tipoDocumento,
        numeroDocumento,
        nombres: pick(nombres, i),
        apellidos: pick(apellidos, i),
        edad: 18 + (i % 45),
        celular: `9${String(30000000 + i).slice(0, 8)}`,
        correo: `participante.demo.${pad(i)}@caritas.pe`,
        rolPastoralComunitario: i % 2 === 0 ? "Brigadista" : "Agente pastoral",
      },
    });

    const cursoActual = pick(cursos, i);
    const existingIns = await prisma.inscripcionCurso.findFirst({
      where: {
        idCursoCapacitacion: cursoActual.idCursoCapacitacion,
        idParticipante: participante.idParticipante,
      },
    });

    if (existingIns) continue;

    const inscripcion = await prisma.inscripcionCurso.create({
      data: {
        idCursoCapacitacion: cursoActual.idCursoCapacitacion,
        idParticipante: participante.idParticipante,
        fechaInicioContenido: new Date(),
        fechaFinalizacionContenido: i % 3 === 0 ? new Date() : null,
        estadoInscripcion: i % 3 === 0 ? "FINALIZADO" : "EN_PROGRESO",
        canalComunicacion: "Web",
      },
    });

    const unidades = await prisma.unidadContenido.findMany({
      where: { idCursoCapacitacion: cursoActual.idCursoCapacitacion },
      select: { idUnidadContenido: true },
    });

    for (const [idx, unidad] of unidades.entries()) {
      const terminado = i % 3 === 0 || idx === 0;
      await prisma.progresoCapacitacion.create({
        data: {
          idInscripcionCurso: inscripcion.idInscripcionCurso,
          idUnidadContenido: unidad.idUnidadContenido,
          porcentajeAvance: terminado ? 100 : 50,
          estadoProgreso: terminado ? "COMPLETADO" : "EN_PROGRESO",
          fechaInicio: new Date(),
          fechaUltimoAcceso: new Date(),
          fechaCompletado: terminado ? new Date() : null,
          observacion: "Progreso generado para prueba.",
        },
      });
    }

    const nota = i % 4 === 0 ? 11 : 15 + (i % 6);
    await prisma.evaluacionCurso.create({
      data: {
        idInscripcionCurso: inscripcion.idInscripcionCurso,
        tipoEvaluacion: "FINAL",
        numeroIntento: 1,
        nota,
        resultado: nota >= 13 ? "APROBADO" : "DESAPROBADO",
        fechaEvaluacion: new Date(),
        observacion: "Evaluación generada automáticamente.",
      },
    });

    if (nota >= 13 && i % 2 === 0) {
      const certExists = await prisma.certificacionCurso.findUnique({
        where: { idInscripcionCurso: inscripcion.idInscripcionCurso },
      });

      if (!certExists) {
        await prisma.certificacionCurso.create({
          data: {
            idInscripcionCurso: inscripcion.idInscripcionCurso,
            estadoCertificacion: "GENERADA",
            fechaCertificacion: new Date(),
            constanciaUrl: `https://constancias.caritas.demo/${inscripcion.idInscripcionCurso}.pdf`,
            medioEnvioConstancia: "Correo electrónico",
          },
        });
      }
    }
  }

  // 11. Evidencias, observaciones y auditoría transversal
  const tipoIncidencia = await ensureTipoReferencia("INCIDENCIA", "Incidencia");
  const tipoActividad = await ensureTipoReferencia("ACTIVIDAD_PREVENTIVA", "Actividad preventiva");
  const tipoKit = await ensureTipoReferencia("KIT_EMERGENCIA", "Kit de emergencia");
  const tiposReferencia = [tipoIncidencia, tipoActividad, tipoKit];

  const refIds = [
    ...incidencias.map((x) => ({
      tipo: tipoIncidencia,
      id: x.idIncidencia,
      modulo: "INCIDENCIAS",
    })),
    ...actividades.map((x) => ({
      tipo: tipoActividad,
      id: x.idActividadPreventiva,
      modulo: "PREVENCION",
    })),
    ...kits.map((x) => ({ tipo: tipoKit, id: x.idKitEmergencia, modulo: "LOGISTICA" })),
  ];

  const nEvid = await prisma.evidenciaGRD.count();
  for (let i = nEvid; i < TARGETS.evidencias; i++) {
    const ref = pick(refIds, i);
    await prisma.evidenciaGRD.create({
      data: {
        idTipoReferencia: ref.tipo.idTipoReferencia,
        idReferencia: ref.id,
        idUsuarioCargaGRD: idUsuarioGRD,
        nombreArchivo: `evidencia-demo-${pad(i + 1, 4)}.jpg`,
        urlArchivo: `https://storage.caritas.demo/evidencia-demo-${pad(i + 1, 4)}.jpg`,
        formatoArchivo: "image/jpeg",
        descripcion: `Evidencia artificial asociada a ${ref.modulo}.`,
        tamanoArchivo: 250000 + i * 1000,
        latitud: String(-12.05 - (i % 10) * 0.001),
        longitud: String(-77.04 - (i % 10) * 0.001),
        syncEstado: "SINCRONIZADO",
      },
    });
  }

  const nObs = await prisma.observacionGRD.count();
  for (let i = nObs; i < TARGETS.observaciones; i++) {
    const ref = pick(refIds, i);
    await prisma.observacionGRD.create({
      data: {
        idTipoReferencia: ref.tipo.idTipoReferencia,
        idReferencia: ref.id,
        idUsuarioGRD,
        textoObservacion: `Observación demo ${i + 1}: revisión operativa registrada para ${ref.modulo}.`,
        syncEstado: "SINCRONIZADO",
      },
    });
  }

  const nAud = await prisma.historialAuditoriaGRD.count();
  for (let i = nAud; i < TARGETS.auditorias; i++) {
    const ref = pick(refIds, i);
    await prisma.historialAuditoriaGRD.create({
      data: {
        idTipoReferencia: ref.tipo.idTipoReferencia,
        idReferencia: ref.id,
        idUsuarioGRD,
        campoModificado: i % 2 === 0 ? "estado" : "observacion",
        valorAnterior: i % 2 === 0 ? "BORRADOR" : "Sin observación",
        valorNuevo: i % 2 === 0 ? "ACTIVO" : "Observación registrada",
        estadoAnterior: i % 2 === 0 ? "PENDIENTE" : null,
        estadoNuevo: i % 2 === 0 ? "ACTIVO" : null,
        ipOrigen: "127.0.0.1",
        modulo: ref.modulo,
        observacion: "Auditoría transversal generada para pruebas.",
      },
    });
  }

  // 12. Historial de estados adicional
  const nHist = await prisma.historialEstadoIncidencia.count();
  for (let i = nHist; i < TARGETS.historialEstados; i++) {
    const incidencia = pick(incidencias, i);
    const anterior = pick(estados, i);
    const nuevo = pick(estados, i + 1);

    await prisma.historialEstadoIncidencia.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        idUsuarioGRD,
        estadoAnterior: anterior,
        estadoNuevo: nuevo,
        motivoCambio: "Transición artificial para pruebas de trazabilidad.",
        observaciones: "Registro generado por megaseed masivo.",
      },
    });
  }

  const resumen = await Promise.all([
    prisma.parroquia.count(),
    prisma.brigadistaParroquial.count(),
    prisma.incidencia.count(),
    prisma.grupoFamiliarAfectado.count(),
    prisma.personaAfectada.count(),
    prisma.kitEmergencia.count(),
    prisma.movimientoKit.count(),
    prisma.planTrabajoGRD.count(),
    prisma.actividadPreventiva.count(),
    prisma.cursoCapacitacion.count(),
    prisma.inscripcionCurso.count(),
    prisma.progresoCapacitacion.count(),
    prisma.evidenciaGRD.count(),
    prisma.observacionGRD.count(),
    prisma.historialAuditoriaGRD.count(),
    prisma.historialEstadoIncidencia.count(),
  ]);

  console.log("   ✓ Demo masivo verificado:");
  console.log(
    `     Parroquias: ${resumen[0]} · Brigadistas: ${resumen[1]} · Incidencias: ${resumen[2]}`
  );
  console.log(
    `     Familias: ${resumen[3]} · Personas afectadas: ${resumen[4]} · Kits: ${resumen[5]} · Movimientos: ${resumen[6]}`
  );
  console.log(
    `     Planes: ${resumen[7]} · Actividades: ${resumen[8]} · Cursos: ${resumen[9]} · Inscripciones: ${resumen[10]} · Progresos: ${resumen[11]}`
  );
  console.log(
    `     Evidencias: ${resumen[12]} · Observaciones: ${resumen[13]} · Auditorías: ${resumen[14]} · Historial estados: ${resumen[15]}`
  );
}
async function main() {
  console.log("\n=== MEGASEED (vía casos de uso del core) ===\n");

  const parroquias = await prisma.parroquia.findMany({
    select: { idParroquia: true, nombre: true },
  });
  const usuarioGRD = await prisma.usuarioGRD.findFirst({ select: { idUsuarioGRD: true } });
  const brigadistas = await prisma.brigadistaParroquial.findMany({
    select: { idBrigadistaParroquial: true },
  });
  if (parroquias.length === 0 || !usuarioGRD) {
    console.error("Faltan parroquias/UsuarioGRD. Corre `npm run seed` primero.");
    process.exit(1);
  }
  const idUsuarioGRD = usuarioGRD.idUsuarioGRD;
  const p0 = parroquias[0];

  // Brigadistas extra (para asignaciones variadas)
  if (brigadistas.length < 3) {
    console.log("👷 Brigadistas extra...");
    const extra = [
      { nombres: "Luis", apellidos: "Ramírez Pérez", dni: "45111222", celular: "965432178" },
      { nombres: "Rosa", apellidos: "Quispe Mamani", dni: "45333444", celular: "943215678" },
      { nombres: "Carlos", apellidos: "Mendoza Silva", dni: "45555666", celular: "921876543" },
    ];
    for (const b of extra) {
      const exists = await prisma.brigadistaParroquial.findFirst({ where: { dni: b.dni } });
      if (!exists)
        await prisma.brigadistaParroquial.create({
          data: {
            ...b,
            idParroquia: p0.idParroquia,
            disponibilidad: "DISPONIBLE",
            estado: "ACTIVO",
          },
        });
    }
  }
  const brigs = await prisma.brigadistaParroquial.findMany({
    select: { idBrigadistaParroquial: true },
  });
  const brigId = (i: number) => brigs[i % brigs.length].idBrigadistaParroquial;

  // ── INCIDENCIAS en distintos estados (poblan GRD, Donaciones, Auditoría, Reportes) ──
  const yaHay = await prisma.incidencia.count();
  if (yaHay >= 6) {
    console.log(
      `🔁 Ya existen ${yaHay} incidencias — se omite el sembrado de incidencias para no duplicar.`
    );
  } else {
    console.log("🚨 Incidencias (flujo real)...");
    const parr = (i: number) => parroquias[i % parroquias.length].nombre;

    // 2 ABIERTO
    await inc.registrar.execute(
      incidenteData({
        categoria: "Incendio",
        distrito: "San Juan de Lurigancho",
        parroquia: parr(0),
        descripcion: "Incendio en vivienda multifamiliar",
      })
    );
    await inc.registrar.execute(
      incidenteData({
        categoria: "Inundación",
        distrito: "Villa María del Triunfo",
        parroquia: parr(1),
        descripcion: "Inundación por desborde",
      })
    );

    // 2 ASIGNADO
    for (let i = 0; i < 2; i++) {
      const id = await inc.registrar.execute(
        incidenteData({
          categoria: "Derrumbe",
          distrito: "Puente Piedra",
          parroquia: parr(i),
          descripcion: "Deslizamiento de ladera",
        })
      );
      await inc.asignar.execute(id, brigId(i));
    }

    // 1 DATA RECOPILADA
    {
      const id = await inc.registrar.execute(
        incidenteData({
          categoria: "Sismo",
          distrito: "Ate",
          parroquia: parr(0),
          descripcion: "Daños por sismo",
        })
      );
      await inc.asignar.execute(id, brigId(0));
      await inc.registrarCampo.execute(id, infoCampo("Ana Torres"), "Ana Torres");
    }

    // 1 EN EVALUACION (aparece en la cola del Comité)
    {
      const id = await inc.registrar.execute(
        incidenteData({
          categoria: "Deslizamiento",
          distrito: "Independencia",
          parroquia: parr(1),
          descripcion: "Deslizamiento con viviendas inhabitables",
        })
      );
      await inc.asignar.execute(id, brigId(1));
      await inc.registrarCampo.execute(id, infoCampo("Luis Ramírez"), "Luis Ramírez");
      await inc.generarInforme.execute(id, informeEval, "Carlos Méndez — Especialista GRD");
    }

    // 1 ciclo completo → CERRADO
    {
      const id = await inc.registrar.execute(
        incidenteData({
          categoria: "Vendaval",
          distrito: "El Agustino",
          parroquia: parr(0),
          descripcion: "Pérdida de techo por vendaval",
        })
      );
      await inc.asignar.execute(id, brigId(2));
      await inc.registrarCampo.execute(id, infoCampo("Rosa Quispe"), "Rosa Quispe");
      await inc.generarInforme.execute(id, informeEval, "Carlos Méndez — Especialista GRD");
      await inc.decisionComite.execute(id, "APROBAR", "Aprobado por urgencia (gestante).");
      await inc.registrarAtencion.execute(id, {
        tipoAyuda: "Kit de víveres + abrigo",
        descripcionAyuda: "Entrega de víveres y frazadas",
        lugarEntrega: "Domicilio afectado",
      });
      await inc.agregarSeguimiento.execute(id, {
        situacion: "Mejoró",
        descripcion: "Familia con techo provisional",
        recomendaciones: "Cierre",
      });
      await inc.cerrar.execute(id);
    }

    // 1 RECHAZADO
    {
      const id = await inc.registrar.execute(
        incidenteData({
          categoria: "Incendio",
          distrito: "Comas",
          parroquia: parr(1),
          descripcion: "Conato menor sin afectación grave",
        })
      );
      await inc.asignar.execute(id, brigId(0));
      await inc.registrarCampo.execute(id, infoCampo("Ana Torres"), "Ana Torres");
      await inc.generarInforme.execute(id, informeEval, "Carlos Méndez — Especialista GRD");
      await inc.decisionComite.execute(id, "RECHAZAR", "No cumple criterios de priorización.");
    }
    console.log("   ✓ 8 incidencias creadas en distintos estados del flujo");
  }

  // ── PLANES (varios estados de aprobación) ──
  if ((await prisma.planTrabajoGRD.count()) < 2) {
    console.log("📋 Planes...");
    const p1 = await plan.crear.execute({
      idParroquia: p0.idParroquia,
      idUsuarioResponsableGRD: idUsuarioGRD,
      nombrePlan: "Plan GRD 2026 — Prevención de incendios",
      objetivos: "Reducir el riesgo ante incendios estructurales.",
      fechaInicio: "2026-01-15",
      fechaFin: "2026-12-31",
    });
    await plan.cambiarAprobacion.execute(p1.id, "ENVIAR");
    await plan.cambiarAprobacion.execute(p1.id, "APROBAR");
    const p2 = await plan.crear.execute({
      idParroquia: parroquias[1 % parroquias.length].idParroquia,
      idUsuarioResponsableGRD: idUsuarioGRD,
      nombrePlan: "Plan GRD 2026 — Inundaciones",
      objetivos: "Mitigar impacto de lluvias e inundaciones.",
      fechaInicio: "2026-02-01",
      fechaFin: "2026-11-30",
    });
    await plan.cambiarAprobacion.execute(p2.id, "ENVIAR");
    await plan.crear.execute({
      idParroquia: p0.idParroquia,
      idUsuarioResponsableGRD: idUsuarioGRD,
      nombrePlan: "Plan GRD 2026 — Sismos (borrador)",
      objetivos: "Rutas de evacuación y zonas seguras.",
      fechaInicio: "2026-03-01",
      fechaFin: "2026-12-31",
    });
    console.log("   ✓ 3 planes (aprobado, en revisión, borrador)");
  }

  // ── SIMULACROS / Actividades preventivas ──
  if ((await prisma.actividadPreventiva.count()) < 2) {
    console.log("🛡️  Simulacros...");
    // Fechas relativas a hoy: evita que la validación "fecha ≥ hoy" rompa el seed con el paso del tiempo.
    const enDiasISO = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const a1 = await act.programar.execute({
      idParroquia: p0.idParroquia,
      idUsuarioRegistroGRD: idUsuarioGRD,
      idTipoActividadPreventiva: "Simulacro de Sismo",
      nombreActividad: "Simulacro de Sismo Parroquial",
      fechaProgramada: enDiasISO(0),
      lugarActividad: "Local parroquial",
      numeroParticipantesEstimado: 120,
    });
    await act.ejecutar.execute(a1.id, {
      resultadoGeneral: "Evacuación en 3 min, sin incidentes",
      numeroParticipantesReal: 98,
      recomendaciones: "Señalizar mejor salidas",
    });
    await act.programar.execute({
      idParroquia: parroquias[1 % parroquias.length].idParroquia,
      idUsuarioRegistroGRD: idUsuarioGRD,
      idTipoActividadPreventiva: "Charla de Prevención",
      nombreActividad: "Charla: Mochila de Emergencia",
      fechaProgramada: enDiasISO(10),
      lugarActividad: "Salón parroquial",
      numeroParticipantesEstimado: 50,
    });
    await act.programar.execute({
      idParroquia: p0.idParroquia,
      idUsuarioRegistroGRD: idUsuarioGRD,
      idTipoActividadPreventiva: "Simulacro de Incendio",
      nombreActividad: "Simulacro de Incendio",
      fechaProgramada: enDiasISO(20),
      lugarActividad: "Patio principal",
      numeroParticipantesEstimado: 80,
    });
    console.log("   ✓ 3 actividades (1 ejecutada, 2 programadas)");
  }

  // ── CAPACITACIONES (curso publicado con inscripciones/evaluaciones/certificación) ──
  if ((await prisma.cursoCapacitacion.count()) < 2) {
    console.log("🎓 Capacitaciones...");
    const c1 = await curso.crear.execute({
      idUsuarioResponsableGRD: idUsuarioGRD,
      nombreCurso: "Primeros Auxilios Básicos",
      descripcion: "Curso asincrónico de primeros auxilios.",
      duracionEstimadaHoras: 8,
    });
    await curso.cambiarEstado.execute(c1.id, "PUBLICAR");
    const insA = await curso.inscribir.execute(c1.id, {
      nombres: "Ana",
      apellidos: "Torres",
      tipoDocumento: "DNI",
      numeroDocumento: "45123789",
      correo: "ana@caritas.pe",
    });
    await curso.evaluar.execute(insA.idInscripcion, 17);
    await curso.certificar.execute(insA.idInscripcion);
    const insB = await curso.inscribir.execute(c1.id, {
      nombres: "Pedro",
      apellidos: "Salas",
      tipoDocumento: "DNI",
      numeroDocumento: "45987654",
    });
    await curso.evaluar.execute(insB.idInscripcion, 9); // desaprobado
    await curso.crear.execute({
      idUsuarioResponsableGRD: idUsuarioGRD,
      nombreCurso: "Gestión de Albergues (borrador)",
      descripcion: "En preparación.",
      duracionEstimadaHoras: 6,
    });
    console.log("   ✓ 2 cursos (1 publicado con 2 inscritos y 1 certificado)");
  }
  await ensureDemoMasivo(idUsuarioGRD);
  // Resumen
  const [nInc, nPlan, nAct, nCurso, nBrig] = await Promise.all([
    prisma.incidencia.count(),
    prisma.planTrabajoGRD.count(),
    prisma.actividadPreventiva.count(),
    prisma.cursoCapacitacion.count(),
    prisma.brigadistaParroquial.count(),
  ]);
  console.log(`\n✅ Megaseed completo:`);
  console.log(
    `   Incidencias: ${nInc} · Planes: ${nPlan} · Actividades: ${nAct} · Cursos: ${nCurso} · Brigadistas: ${nBrig}\n`
  );
}

main()
  .catch((e) => {
    console.error("💥", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
