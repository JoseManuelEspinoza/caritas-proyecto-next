/**
 * Verificación de consistencia de TODOS los módulos vía core/ contra la BD real.
 * Detecta inconsistencias (FKs, campos requeridos, transiciones, mappers) antes
 * de sembrar un megaseed.
 * Ejecutar: docker compose exec web npx tsx prisma/verify-all.ts
 */
import { prisma } from '../app/lib/prisma'
import { makeCatalogoUseCases } from '../core/infrastructure/factories/makeCatalogoUseCases'
import { makeKitUseCases } from '../core/infrastructure/factories/makeKitUseCases'
import { makePlanUseCases } from '../core/infrastructure/factories/makePlanUseCases'
import { makeActividadUseCases } from '../core/infrastructure/factories/makeActividadUseCases'
import { makeCursoUseCases } from '../core/infrastructure/factories/makeCursoUseCases'

let okCount = 0
let failCount = 0
const fails: string[] = []

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    okCount++
    console.log(`✅ ${label}`)
  } catch (e) {
    failCount++
    const msg = e instanceof Error ? e.message : String(e)
    fails.push(`${label} → ${msg}`)
    console.log(`❌ ${label} → ${msg}`)
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function main() {
  console.log('\n=== Verificación de consistencia (vista ↔ entidad ↔ flujo) ===\n')

  const parroquia = await prisma.parroquia.findFirst({ select: { idParroquia: true } })
  const usuarioGRD = await prisma.usuarioGRD.findFirst({ select: { idUsuarioGRD: true } })
  assert(!!parroquia, 'No hay parroquias (corre el seed)')
  assert(!!usuarioGRD, 'No hay UsuarioGRD (corre el seed)')
  const idParroquia = parroquia!.idParroquia
  const idUsuarioGRD = usuarioGRD!.idUsuarioGRD

  // ── CATÁLOGOS ──────────────────────────────────────────────────────────────
  console.log('\n🗂️  Catálogos')
  const cat = makeCatalogoUseCases()
  await step('Crear catálogo + detalle + editar + toggle + listar', async () => {
    const c = await cat.crearCatalogo.execute(`CHK Catálogo ${Date.now()}`, 'check')
    const d = await cat.agregarDetalle.execute({ idCatalogoGRD: c.id, codigo: 'CHK1', valor: 'Valor 1' })
    const e = await cat.editarDetalle.execute(d.id, 'Valor 1 editado')
    assert(e.valor === 'Valor 1 editado', 'editarDetalle no actualizó el valor')
    const t = await cat.toggleDetalle.execute(d.id)
    assert(t.estado === 'INACTIVO', 'toggleDetalle no desactivó')
    const lista = await cat.listarDetalles.execute(c.id)
    assert(lista.length === 1, 'listarDetalles no devuelve el ítem')
  })

  // ── KITS (incluye invariante de stock) ──────────────────────────────────────
  console.log('\n📦 Kits')
  const kit = makeKitUseCases()
  let kitId = ''
  await step('Crear kit + ingreso + entrega + historial + stock', async () => {
    const k = await kit.crear.execute({ tipoKit: `CHK Kit ${Date.now()}`, stockInicial: 10 })
    kitId = k.id
    const k1 = await kit.registrarMovimiento.execute(k.id, { tipo: 'INGRESO', cantidad: 5, idUsuarioResponsableGRD: idUsuarioGRD })
    assert(k1.stockActual === 15, `stock tras ingreso debería ser 15, es ${k1.stockActual}`)
    const k2 = await kit.registrarMovimiento.execute(k.id, { tipo: 'ENTREGA', cantidad: 3, idUsuarioResponsableGRD: idUsuarioGRD, idParroquiaDestino: idParroquia })
    assert(k2.stockActual === 12, `stock tras entrega debería ser 12, es ${k2.stockActual}`)
    const movs = await kit.listarMovimientos.execute(k.id)
    assert(movs.length === 2, `historial debería tener 2 movimientos, tiene ${movs.length}`)
  })
  await step('Kit: bloquear entrega sin stock (invariante)', async () => {
    let bloqueado = false
    try { await kit.registrarMovimiento.execute(kitId, { tipo: 'ENTREGA', cantidad: 9999, idUsuarioResponsableGRD: idUsuarioGRD }) }
    catch { bloqueado = true }
    assert(bloqueado, 'NO bloqueó una entrega sin stock suficiente')
  })

  // ── PLANES (flujo de aprobación) ────────────────────────────────────────────
  console.log('\n📋 Planes')
  const plan = makePlanUseCases()
  await step('Crear plan + enviar + aprobar', async () => {
    const p = await plan.crear.execute({ idParroquia, idUsuarioResponsableGRD: idUsuarioGRD, nombrePlan: `CHK Plan ${Date.now()}`, objetivos: 'check' })
    assert(p.estadoAprobacion === 'BORRADOR', 'plan no nace en BORRADOR')
    await plan.cambiarAprobacion.execute(p.id, 'ENVIAR')
    const aprobado = await plan.cambiarAprobacion.execute(p.id, 'APROBAR')
    assert(aprobado.estadoAprobacion === 'APROBADO', 'plan no llegó a APROBADO')
  })

  // ── SIMULACROS / ActividadPreventiva ────────────────────────────────────────
  console.log('\n🛡️  Simulacros')
  const act = makeActividadUseCases()
  await step('Programar + ejecutar', async () => {
    const a = await act.programar.execute({ idParroquia, idUsuarioRegistroGRD: idUsuarioGRD, idTipoActividadPreventiva: 'Simulacro de Sismo', nombreActividad: `CHK Simulacro ${Date.now()}` })
    assert(a.estadoActividad === 'PROGRAMADA', 'actividad no nace PROGRAMADA')
    const ej = await act.ejecutar.execute(a.id, { resultadoGeneral: 'OK', numeroParticipantesReal: 20 })
    assert(ej.estadoActividad === 'EJECUTADA', 'actividad no llegó a EJECUTADA')
  })

  // ── CAPACITACIONES (curso → inscripción → evaluación → certificación) ───────
  console.log('\n🎓 Capacitaciones')
  const curso = makeCursoUseCases()
  await step('Crear curso + publicar + inscribir + evaluar (aprobado) + certificar', async () => {
    const c = await curso.crear.execute({ idUsuarioResponsableGRD: idUsuarioGRD, nombreCurso: `CHK Curso ${Date.now()}` })
    await curso.cambiarEstado.execute(c.id, 'PUBLICAR')
    const insc = await curso.inscribir.execute(c.id, { nombres: 'Test', apellidos: 'Participante', tipoDocumento: 'DNI', numeroDocumento: `${Date.now()}`.slice(-8) })
    const ev = await curso.evaluar.execute(insc.idInscripcion, 15)
    assert(ev.resultado === 'APROBADO', `nota 15 debería ser APROBADO, fue ${ev.resultado}`)
    await curso.certificar.execute(insc.idInscripcion)
    const lista = await curso.listarInscripciones.execute(c.id)
    assert(lista.length === 1 && lista[0].certificado, 'la inscripción no quedó certificada')
  })
  await step('Capacitaciones: no certificar sin aprobar (regla)', async () => {
    const c = await curso.crear.execute({ idUsuarioResponsableGRD: idUsuarioGRD, nombreCurso: `CHK Curso2 ${Date.now()}` })
    await curso.cambiarEstado.execute(c.id, 'PUBLICAR')
    const insc = await curso.inscribir.execute(c.id, { nombres: 'Test2', tipoDocumento: 'DNI', numeroDocumento: `${Date.now()}`.slice(-8) })
    await curso.evaluar.execute(insc.idInscripcion, 8) // desaprobado
    let bloqueado = false
    try { await curso.certificar.execute(insc.idInscripcion) } catch { bloqueado = true }
    assert(bloqueado, 'NO bloqueó certificar a un desaprobado')
  })

  // ── DONACIONES (lectura que usa la vista del Comité) ────────────────────────
  console.log('\n🤝 Donaciones (lectura de la vista)')
  await step('Query de la vista Comité (incidencia + solicitud + informe)', async () => {
    const rows = await prisma.incidencia.findMany({
      where: { estadoActual: { in: ['EN EVALUACION', 'OBSERVADO', 'APROBADO', 'ATENDIDO', 'SEGUIMIENTO ABIERTO', 'RECHAZADO', 'CERRADO'] } },
      select: {
        idIncidencia: true, codigoCaso: true,
        parroquia: { select: { nombre: true } },
        solicitudesAyuda: { take: 1, select: { tipoAyudaSolicitada: true } },
        informes: { where: { tipoInforme: 'EVALUACION' }, take: 1, select: { contenido: true } },
      },
    })
    // que el informe parsee como JSON (lo que hace la página)
    for (const r of rows) {
      const c = r.informes[0]?.contenido
      if (c) JSON.parse(c)
    }
    console.log(`   (casos en pipeline de donaciones: ${rows.length})`)
  })

  console.log(`\n${failCount === 0 ? '🎉 TODO CONSISTENTE' : '⚠️  INCONSISTENCIAS ENCONTRADAS'} — ${okCount} OK, ${failCount} fallos`)
  if (fails.length) { console.log('\nFallos:'); fails.forEach((f) => console.log('  • ' + f)) }
  process.exit(failCount === 0 ? 0 : 1)
}

main().catch((e) => { console.error('💥', e); process.exit(1) }).finally(() => prisma.$disconnect())
