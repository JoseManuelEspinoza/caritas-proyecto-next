/**
 * MEGASEED — puebla todos los módulos GRD usando los CASOS DE USO del core/,
 * de modo que los datos sean coherentes con el flujo real (historial,
 * solicitudes, entregas, certificaciones se generan por las reglas, no a mano).
 *
 * Requisitos: corre primero `npm run seed` (parroquias, usuarios, catálogos, kits).
 * Ejecutar: docker compose exec web npx tsx prisma/megaseed.ts
 * Es idempotente por conteo: si ya hay datos sembrados, no duplica.
 */
import { prisma } from '../app/lib/prisma'
import { makeIncidenciaUseCases } from '../core/infrastructure/factories/makeIncidenciaUseCases'
import { makePlanUseCases } from '../core/infrastructure/factories/makePlanUseCases'
import { makeActividadUseCases } from '../core/infrastructure/factories/makeActividadUseCases'
import { makeCursoUseCases } from '../core/infrastructure/factories/makeCursoUseCases'
import type { CreateIncidenteData } from '../core/application/dtos/IncidenciaDTO'

const inc = makeIncidenciaUseCases()
const plan = makePlanUseCases()
const act = makeActividadUseCases()
const curso = makeCursoUseCases()

const infoCampo = (responsable: string) => ({
  fechaVisita: '2026-05-20', responsable, descripcionEvento: 'Daño verificado en campo',
  nivelVulnerabilidad: 'Alto', necesidadesPrioritarias: ['Refugio', 'Alimentación'],
  recomendacion: 'Asistencia humanitaria urgente', observaciones: 'Familia sin red de apoyo',
  condHabitabilidad: { agua: false, electricidad: true, refugio: false, saludAmbiental: false, acceso: true },
})
const informeEval = {
  analisisSituacion: 'Familia en alta vulnerabilidad tras el evento.',
  hallazgosTexto: 'Pérdida de enseres y techo; presencia de gestante.',
  conclusiones: 'Se recomienda intervención con kit de víveres y abrigo.',
  nivelUrgencia: 'Inmediata', tipoIntervencion: 'Donación en especie', recomendacionComite: 'Aprobar por urgencia.',
}

function incidenteData(over: Partial<CreateIncidenteData>): CreateIncidenteData {
  return {
    reportaDni: '47823456', reportaNombre: 'Vecino Informante', reportaTel: '987654321', reportaRol: 'Comunidad / Vecinos',
    fechaReporte: '2026-05-20', fechaSuceso: '2026-05-19', horaSuceso: '15:00',
    categoria: 'Incendio', pais: 'Perú', region: 'Lima Metropolitana', distrito: 'San Juan de Lurigancho',
    parroquia: '', direccion: 'Av. Ejemplo 100', referencia: 'Cerca al mercado',
    descripcion: 'Evento con familias afectadas', causa: 'Causa estimada',
    familias: [{ id: 'f1', nombre: 'Familia Afectada' }],
    personas: [{ id: 'p1', tipoDoc: 'DNI', dni: '12345678', nombre: 'María', apellidoPaterno: 'García', apellidoMaterno: 'Luna', edad: '30', genero: 'Femenino', celular: '999888777', parentesco: 'Madre', situacionActual: 'Gestante', familiaId: 'f1' }],
    necesidades: ['Refugio temporal', 'Alimentación'], necesidadOtra: '', necesidadesObs: '',
    nivelAfectacion: 'Severo',
    ...over,
  }
}

async function main() {
  console.log('\n=== MEGASEED (vía casos de uso del core) ===\n')

  const parroquias = await prisma.parroquia.findMany({ select: { idParroquia: true, nombre: true } })
  const usuarioGRD = await prisma.usuarioGRD.findFirst({ select: { idUsuarioGRD: true } })
  const brigadistas = await prisma.brigadistaParroquial.findMany({ select: { idBrigadistaParroquial: true } })
  if (parroquias.length === 0 || !usuarioGRD) { console.error('Faltan parroquias/UsuarioGRD. Corre `npm run seed` primero.'); process.exit(1) }
  const idUsuarioGRD = usuarioGRD.idUsuarioGRD
  const p0 = parroquias[0]

  // Brigadistas extra (para asignaciones variadas)
  if (brigadistas.length < 3) {
    console.log('👷 Brigadistas extra...')
    const extra = [
      { nombres: 'Luis', apellidos: 'Ramírez Pérez', dni: '45111222', celular: '965432178' },
      { nombres: 'Rosa', apellidos: 'Quispe Mamani', dni: '45333444', celular: '943215678' },
      { nombres: 'Carlos', apellidos: 'Mendoza Silva', dni: '45555666', celular: '921876543' },
    ]
    for (const b of extra) {
      const exists = await prisma.brigadistaParroquial.findFirst({ where: { dni: b.dni } })
      if (!exists) await prisma.brigadistaParroquial.create({ data: { ...b, idParroquia: p0.idParroquia, disponibilidad: 'DISPONIBLE', estado: 'ACTIVO' } })
    }
  }
  const brigs = await prisma.brigadistaParroquial.findMany({ select: { idBrigadistaParroquial: true } })
  const brigId = (i: number) => brigs[i % brigs.length].idBrigadistaParroquial

  // ── INCIDENCIAS en distintos estados (poblan GRD, Donaciones, Auditoría, Reportes) ──
  const yaHay = await prisma.incidencia.count()
  if (yaHay >= 6) {
    console.log(`🔁 Ya existen ${yaHay} incidencias — se omite el sembrado de incidencias para no duplicar.`)
  } else {
    console.log('🚨 Incidencias (flujo real)...')
    const parr = (i: number) => parroquias[i % parroquias.length].nombre

    // 2 ABIERTO
    await inc.registrar.execute(incidenteData({ categoria: 'Incendio', distrito: 'San Juan de Lurigancho', parroquia: parr(0), descripcion: 'Incendio en vivienda multifamiliar' }))
    await inc.registrar.execute(incidenteData({ categoria: 'Inundación', distrito: 'Villa María del Triunfo', parroquia: parr(1), descripcion: 'Inundación por desborde' }))

    // 2 ASIGNADO
    for (let i = 0; i < 2; i++) {
      const id = await inc.registrar.execute(incidenteData({ categoria: 'Derrumbe', distrito: 'Puente Piedra', parroquia: parr(i), descripcion: 'Deslizamiento de ladera' }))
      await inc.asignar.execute(id, brigId(i))
    }

    // 1 DATA RECOPILADA
    {
      const id = await inc.registrar.execute(incidenteData({ categoria: 'Sismo', distrito: 'Ate', parroquia: parr(0), descripcion: 'Daños por sismo' }))
      await inc.asignar.execute(id, brigId(0))
      await inc.registrarCampo.execute(id, infoCampo('Ana Torres'), 'Ana Torres')
    }

    // 1 EN EVALUACION (aparece en la cola del Comité)
    {
      const id = await inc.registrar.execute(incidenteData({ categoria: 'Deslizamiento', distrito: 'Independencia', parroquia: parr(1), descripcion: 'Deslizamiento con viviendas inhabitables' }))
      await inc.asignar.execute(id, brigId(1))
      await inc.registrarCampo.execute(id, infoCampo('Luis Ramírez'), 'Luis Ramírez')
      await inc.generarInforme.execute(id, informeEval, 'Carlos Méndez — Especialista GRD')
    }

    // 1 ciclo completo → CERRADO
    {
      const id = await inc.registrar.execute(incidenteData({ categoria: 'Vendaval', distrito: 'El Agustino', parroquia: parr(0), descripcion: 'Pérdida de techo por vendaval' }))
      await inc.asignar.execute(id, brigId(2))
      await inc.registrarCampo.execute(id, infoCampo('Rosa Quispe'), 'Rosa Quispe')
      await inc.generarInforme.execute(id, informeEval, 'Carlos Méndez — Especialista GRD')
      await inc.decisionComite.execute(id, 'APROBAR', 'Aprobado por urgencia (gestante).')
      await inc.registrarAtencion.execute(id, { tipoAyuda: 'Kit de víveres + abrigo', descripcionAyuda: 'Entrega de víveres y frazadas', lugarEntrega: 'Domicilio afectado' })
      await inc.agregarSeguimiento.execute(id, { situacion: 'Mejoró', descripcion: 'Familia con techo provisional', recomendaciones: 'Cierre' })
      await inc.cerrar.execute(id)
    }

    // 1 RECHAZADO
    {
      const id = await inc.registrar.execute(incidenteData({ categoria: 'Incendio', distrito: 'Comas', parroquia: parr(1), descripcion: 'Conato menor sin afectación grave' }))
      await inc.asignar.execute(id, brigId(0))
      await inc.registrarCampo.execute(id, infoCampo('Ana Torres'), 'Ana Torres')
      await inc.generarInforme.execute(id, informeEval, 'Carlos Méndez — Especialista GRD')
      await inc.decisionComite.execute(id, 'RECHAZAR', 'No cumple criterios de priorización.')
    }
    console.log('   ✓ 8 incidencias creadas en distintos estados del flujo')
  }

  // ── PLANES (varios estados de aprobación) ──
  if ((await prisma.planTrabajoGRD.count()) < 2) {
    console.log('📋 Planes...')
    const p1 = await plan.crear.execute({ idParroquia: p0.idParroquia, idUsuarioResponsableGRD: idUsuarioGRD, nombrePlan: 'Plan GRD 2026 — Prevención de incendios', objetivos: 'Reducir el riesgo ante incendios estructurales.', fechaInicio: '2026-01-15', fechaFin: '2026-12-31' })
    await plan.cambiarAprobacion.execute(p1.id, 'ENVIAR')
    await plan.cambiarAprobacion.execute(p1.id, 'APROBAR')
    const p2 = await plan.crear.execute({ idParroquia: parroquias[1 % parroquias.length].idParroquia, idUsuarioResponsableGRD: idUsuarioGRD, nombrePlan: 'Plan GRD 2026 — Inundaciones', objetivos: 'Mitigar impacto de lluvias e inundaciones.', fechaInicio: '2026-02-01', fechaFin: '2026-11-30' })
    await plan.cambiarAprobacion.execute(p2.id, 'ENVIAR')
    await plan.crear.execute({ idParroquia: p0.idParroquia, idUsuarioResponsableGRD: idUsuarioGRD, nombrePlan: 'Plan GRD 2026 — Sismos (borrador)', objetivos: 'Rutas de evacuación y zonas seguras.', fechaInicio: '2026-03-01', fechaFin: '2026-12-31' })
    console.log('   ✓ 3 planes (aprobado, en revisión, borrador)')
  }

  // ── SIMULACROS / Actividades preventivas ──
  if ((await prisma.actividadPreventiva.count()) < 2) {
    console.log('🛡️  Simulacros...')
    const a1 = await act.programar.execute({ idParroquia: p0.idParroquia, idUsuarioRegistroGRD: idUsuarioGRD, idTipoActividadPreventiva: 'Simulacro de Sismo', nombreActividad: 'Simulacro de Sismo Parroquial', fechaProgramada: '2026-06-15', numeroParticipantesEstimado: 120 })
    await act.ejecutar.execute(a1.id, { resultadoGeneral: 'Evacuación en 3 min, sin incidentes', numeroParticipantesReal: 98, recomendaciones: 'Señalizar mejor salidas' })
    await act.programar.execute({ idParroquia: parroquias[1 % parroquias.length].idParroquia, idUsuarioRegistroGRD: idUsuarioGRD, idTipoActividadPreventiva: 'Charla de Prevención', nombreActividad: 'Charla: Mochila de Emergencia', fechaProgramada: '2026-06-20', numeroParticipantesEstimado: 50 })
    await act.programar.execute({ idParroquia: p0.idParroquia, idUsuarioRegistroGRD: idUsuarioGRD, idTipoActividadPreventiva: 'Simulacro de Incendio', nombreActividad: 'Simulacro de Incendio', fechaProgramada: '2026-07-01', numeroParticipantesEstimado: 80 })
    console.log('   ✓ 3 actividades (1 ejecutada, 2 programadas)')
  }

  // ── CAPACITACIONES (curso publicado con inscripciones/evaluaciones/certificación) ──
  if ((await prisma.cursoCapacitacion.count()) < 2) {
    console.log('🎓 Capacitaciones...')
    const c1 = await curso.crear.execute({ idUsuarioResponsableGRD: idUsuarioGRD, nombreCurso: 'Primeros Auxilios Básicos', descripcion: 'Curso asincrónico de primeros auxilios.', duracionEstimadaHoras: 8 })
    await curso.cambiarEstado.execute(c1.id, 'PUBLICAR')
    const insA = await curso.inscribir.execute(c1.id, { nombres: 'Ana', apellidos: 'Torres', tipoDocumento: 'DNI', numeroDocumento: '45123789', correo: 'ana@caritas.pe' })
    await curso.evaluar.execute(insA.idInscripcion, 17)
    await curso.certificar.execute(insA.idInscripcion)
    const insB = await curso.inscribir.execute(c1.id, { nombres: 'Pedro', apellidos: 'Salas', tipoDocumento: 'DNI', numeroDocumento: '45987654' })
    await curso.evaluar.execute(insB.idInscripcion, 9) // desaprobado
    await curso.crear.execute({ idUsuarioResponsableGRD: idUsuarioGRD, nombreCurso: 'Gestión de Albergues (borrador)', descripcion: 'En preparación.', duracionEstimadaHoras: 6 })
    console.log('   ✓ 2 cursos (1 publicado con 2 inscritos y 1 certificado)')
  }

  // Resumen
  const [nInc, nPlan, nAct, nCurso, nBrig] = await Promise.all([
    prisma.incidencia.count(), prisma.planTrabajoGRD.count(), prisma.actividadPreventiva.count(), prisma.cursoCapacitacion.count(), prisma.brigadistaParroquial.count(),
  ])
  console.log(`\n✅ Megaseed completo:`)
  console.log(`   Incidencias: ${nInc} · Planes: ${nPlan} · Actividades: ${nAct} · Cursos: ${nCurso} · Brigadistas: ${nBrig}\n`)
}

main().catch((e) => { console.error('💥', e); process.exit(1) }).finally(() => prisma.$disconnect())
