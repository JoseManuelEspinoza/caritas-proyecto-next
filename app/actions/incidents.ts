'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { verifySession } from '@/app/lib/dal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateCode(): Promise<string> {
  const year = new Date().getFullYear()
  const last = await prisma.incidencia.findFirst({
    where: { codigoCaso: { startsWith: `GRD-${year}-` } },
    orderBy: { codigoCaso: 'desc' },
    select: { codigoCaso: true },
  })
  const num = last?.codigoCaso
    ? parseInt(last.codigoCaso.replace(`GRD-${year}-`, '') ?? '0', 10)
    : 0
  return `GRD-${year}-${String(num + 1).padStart(4, '0')}`
}

async function transicionEstado(
  idIncidencia: string,
  estadoNuevo: string,
  motivoCambio?: string,
  observaciones?: string,
) {
  const actual = await prisma.incidencia.findUnique({
    where: { idIncidencia },
    select: { estadoActual: true },
  })
  await prisma.$transaction([
    prisma.incidencia.update({
      where: { idIncidencia },
      data: { estadoActual: estadoNuevo },
    }),
    prisma.historialEstadoIncidencia.create({
      data: {
        idIncidencia,
        estadoAnterior: actual?.estadoActual,
        estadoNuevo,
        motivoCambio,
        observaciones,
      },
    }),
  ])
}

// ─── Tipos para el formulario de registro ─────────────────────────────────────

export type PersonaForm = {
  id: string
  tipoDoc: string
  dni: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  edad: string
  genero: string
  celular: string
  parentesco: string
  situacionActual: string
  familiaId?: string
}

export type FamiliaForm = {
  id: string
  nombre: string
  observaciones?: string
}

export type CreateIncidenteData = {
  // Sección 1 - Informante
  reportaDni: string
  reportaNombre: string
  reportaTel: string
  reportaRol: string
  fechaReporte: string
  // Sección 2 - Evento
  fechaSuceso: string
  horaSuceso: string
  categoria: string
  pais: string
  region: string
  distrito: string
  parroquia: string
  direccion: string
  referencia: string
  // Sección 3 - Descripción
  descripcion: string
  causa: string
  // Sección 4 - Personas
  familias: FamiliaForm[]
  personas: PersonaForm[]
  // Sección 5 - Necesidades
  necesidades: string[]
  necesidadOtra: string
  necesidadesObs: string
  // Sección 7 - Estimación
  nivelAfectacion: string
}

// ─── Crear incidente ──────────────────────────────────────────────────────────

export async function createIncidente(data: CreateIncidenteData) {
  await verifySession()

  // Validaciones
  if (!data.reportaNombre?.trim()) return { message: 'Ingresa el nombre de quien reportó.' }
  if (!data.reportaDni?.trim())    return { message: 'Ingresa el DNI de quien reportó.' }
  if (!data.reportaTel?.trim())    return { message: 'Ingresa el celular de quien reportó.' }
  if (!data.reportaRol)            return { message: 'Selecciona el rol de quien reportó.' }
  if (!data.categoria)             return { message: 'Selecciona la categoría del evento.' }
  if (!data.fechaSuceso)           return { message: 'Ingresa la fecha del suceso.' }
  if (!data.distrito)              return { message: 'Selecciona el distrito.' }
  if (!data.direccion?.trim())     return { message: 'Ingresa la dirección del evento.' }

  const codigo = await generateCode()

  // Alias autogenerado
  const parrShort = data.parroquia ? data.parroquia.split(' ').slice(-2).join(' ') : ''
  const alias = parrShort
    ? `${data.categoria}-${data.distrito}-${parrShort}`
    : `${data.categoria}-${data.distrito}`

  // Necesidades combinadas
  const todasNecesidades = [
    ...data.necesidades.filter((n) => n !== 'Otros'),
    ...(data.necesidadOtra.trim() ? [data.necesidadOtra.trim()] : []),
  ]

  // Contexto (ubicación y necesidades)
  const contexto = JSON.stringify({
    pais:          data.pais,
    region:        data.region,
    distrito:      data.distrito,
    parroquia:     data.parroquia,
    referencia:    data.referencia,
    causa:         data.causa,
    necesidades:   todasNecesidades,
    necesidadesObs: data.necesidadesObs,
  })

  // Buscar Parroquia en BD por nombre para guardar el FK
  let idParroquiaDb: string | null = null
  if (data.parroquia) {
    const parroquiaRec = await prisma.parroquia.findFirst({
      where:  { nombre: data.parroquia },
      select: { idParroquia: true },
    })
    idParroquiaDb = parroquiaRec?.idParroquia ?? null
  }

  // 1. Crear AvisoEmergencia
  const aviso = await prisma.avisoEmergencia.create({
    data: {
      nombreInformante:    data.reportaNombre.trim(),
      telefonoInformante:  data.reportaTel.trim() || null,
      descripcion:         data.descripcion || null,
      direccionPreliminar: data.direccion.trim(),
      estadoAviso:         'RECIBIDO',
      medioAviso:          data.reportaRol || null,
      ...(idParroquiaDb ? { idParroquia: idParroquiaDb } : {}),
    },
  })

  // 2. Crear Incidencia con parroquia vinculada
  const incidencia = await prisma.incidencia.create({
    data: {
      idAviso:           aviso.idAviso,
      codigoCaso:        codigo,
      tituloIncidencia:  alias,
      tipoEvento:        data.categoria,
      estadoActual:      'ABIERTO',
      direccionEvento:   data.direccion.trim(),
      descripcionEvento: data.descripcion || null,
      contextoCaso:      contexto,
      gravedad:          data.nivelAfectacion || null,
      ...(idParroquiaDb ? { idParroquia: idParroquiaDb } : {}),
    },
  })

  // 3. Crear grupos familiares y personas
  const familiaIdMap: Record<string, string> = {} // clientId → dbId

  for (const familia of data.familias) {
    const grupoDb = await prisma.grupoFamiliarAfectado.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        nombreReferencia: familia.nombre,
        observaciones: familia.observaciones || null,
      },
    })
    familiaIdMap[familia.id] = grupoDb.idGrupoFamiliar
  }

  // Personas sin familia → grupo individual
  const personasSinFamilia = data.personas.filter((p) => !p.familiaId)
  if (personasSinFamilia.length > 0) {
    const grupoInd = await prisma.grupoFamiliarAfectado.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        nombreReferencia: 'Personas individuales',
      },
    })
    for (const p of personasSinFamilia) {
      familiaIdMap[`ind_${p.id}`] = grupoInd.idGrupoFamiliar
    }
  }

  // 4. Crear PersonaAfectada
  for (const persona of data.personas) {
    const idGrupo = persona.familiaId
      ? (familiaIdMap[persona.familiaId] ?? Object.values(familiaIdMap)[0])
      : (familiaIdMap[`ind_${persona.id}`] ?? Object.values(familiaIdMap)[0])

    if (!idGrupo) continue

    await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar: idGrupo,
        tipoDocumento: persona.tipoDoc || null,
        numeroDocumento: persona.dni || null,
        nombres: persona.nombre,
        apellidos: [persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ') || null,
        sexo: persona.genero || null,
        parentesco: persona.parentesco || null,
        condicionEspecial: persona.situacionActual || null,
        esVulnerable: Boolean(persona.situacionActual),
        telefono: persona.celular || null,
        fechaNacimiento: persona.edad
          ? new Date(new Date().getFullYear() - parseInt(persona.edad), 0, 1)
          : null,
      },
    })
  }

  // 5. Historial
  await prisma.historialEstadoIncidencia.create({
    data: {
      idIncidencia: incidencia.idIncidencia,
      estadoNuevo: 'ABIERTO',
      motivoCambio: 'Registro inicial del incidente',
    },
  })

  redirect(`/grd/${incidencia.idIncidencia}`)
}

// ─── Actualizar incidente ─────────────────────────────────────────────────────

export async function updateIncidente(incidenciaId: string, data: CreateIncidenteData) {
  await verifySession()

  if (!data.categoria)         return { message: 'Selecciona la categoría del evento.' }
  if (!data.distrito)          return { message: 'Selecciona el distrito.' }
  if (!data.direccion?.trim()) return { message: 'Ingresa la dirección del evento.' }

  const inc = await prisma.incidencia.findUnique({
    where:  { idIncidencia: incidenciaId },
    select: { idAviso: true, estadoActual: true },
  })
  if (!inc) return { message: 'Incidencia no encontrada.' }
  if (inc.estadoActual !== 'ABIERTO') return { message: 'Solo se pueden editar incidentes en estado ABIERTO.' }

  // Alias y contexto
  const parrShort = data.parroquia ? data.parroquia.split(' ').slice(-2).join(' ') : ''
  const alias     = parrShort ? `${data.categoria}-${data.distrito}-${parrShort}` : `${data.categoria}-${data.distrito}`

  const todasNecesidades = [
    ...data.necesidades.filter((n) => n !== 'Otros'),
    ...(data.necesidadOtra.trim() ? [data.necesidadOtra.trim()] : []),
  ]
  const contexto = JSON.stringify({
    pais: data.pais, region: data.region, distrito: data.distrito,
    parroquia: data.parroquia, referencia: data.referencia,
    causa: data.causa, necesidades: todasNecesidades, necesidadesObs: data.necesidadesObs,
  })

  // Buscar Parroquia en BD por nombre
  let idParroquiaDb: string | null = null
  if (data.parroquia) {
    const parroquiaRec = await prisma.parroquia.findFirst({
      where:  { nombre: data.parroquia },
      select: { idParroquia: true },
    })
    idParroquiaDb = parroquiaRec?.idParroquia ?? null
  }

  // 1. Actualizar Incidencia con parroquia vinculada
  await prisma.incidencia.update({
    where: { idIncidencia: incidenciaId },
    data: {
      tituloIncidencia:  alias,
      tipoEvento:        data.categoria,
      direccionEvento:   data.direccion.trim(),
      descripcionEvento: data.descripcion || null,
      contextoCaso:      contexto,
      gravedad:          data.nivelAfectacion || null,
      idParroquia:       idParroquiaDb,
    },
  })

  // 2. Actualizar o crear AvisoEmergencia (informante)
  if (inc.idAviso) {
    await prisma.avisoEmergencia.update({
      where: { idAviso: inc.idAviso },
      data: {
        nombreInformante:    data.reportaNombre.trim() || null,
        telefonoInformante:  data.reportaTel.trim() || null,
        medioAviso:          data.reportaRol || null,
        descripcion:         data.descripcion || null,
        direccionPreliminar: data.direccion.trim(),
      },
    })
  } else if (data.reportaNombre.trim()) {
    const aviso = await prisma.avisoEmergencia.create({
      data: {
        nombreInformante:    data.reportaNombre.trim(),
        telefonoInformante:  data.reportaTel.trim() || null,
        descripcion:         data.descripcion || null,
        direccionPreliminar: data.direccion.trim(),
        estadoAviso:         'RECIBIDO',
        medioAviso:          data.reportaRol || null,
      },
    })
    await prisma.incidencia.update({
      where: { idIncidencia: incidenciaId },
      data:  { idAviso: aviso.idAviso },
    })
  }

  // 3. Borrar personas y grupos existentes (respetando FK: personas primero)
  const gruposExistentes = await prisma.grupoFamiliarAfectado.findMany({
    where:  { idIncidencia: incidenciaId },
    select: { idGrupoFamiliar: true },
  })
  const grupoIds = gruposExistentes.map((g) => g.idGrupoFamiliar)
  if (grupoIds.length > 0) {
    await prisma.personaAfectada.deleteMany({ where: { idGrupoFamiliar: { in: grupoIds } } })
    await prisma.grupoFamiliarAfectado.deleteMany({ where: { idGrupoFamiliar: { in: grupoIds } } })
  }

  // 4. Recrear grupos familiares
  const familiaIdMap: Record<string, string> = {}
  for (const familia of data.familias) {
    const grupoDb = await prisma.grupoFamiliarAfectado.create({
      data: {
        idIncidencia:     incidenciaId,
        nombreReferencia: familia.nombre,
        observaciones:    familia.observaciones || null,
      },
    })
    familiaIdMap[familia.id] = grupoDb.idGrupoFamiliar
  }

  const personasSinFamilia = data.personas.filter((p) => !p.familiaId)
  if (personasSinFamilia.length > 0) {
    const grupoInd = await prisma.grupoFamiliarAfectado.create({
      data: { idIncidencia: incidenciaId, nombreReferencia: 'Personas individuales' },
    })
    for (const p of personasSinFamilia) {
      familiaIdMap[`ind_${p.id}`] = grupoInd.idGrupoFamiliar
    }
  }

  // 5. Recrear PersonaAfectada
  for (const persona of data.personas) {
    const idGrupo = persona.familiaId
      ? (familiaIdMap[persona.familiaId] ?? Object.values(familiaIdMap)[0])
      : (familiaIdMap[`ind_${persona.id}`] ?? Object.values(familiaIdMap)[0])
    if (!idGrupo) continue

    await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar:   idGrupo,
        tipoDocumento:     persona.tipoDoc || null,
        numeroDocumento:   persona.dni || null,
        nombres:           persona.nombre,
        apellidos:         [persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ') || null,
        sexo:              persona.genero || null,
        parentesco:        persona.parentesco || null,
        condicionEspecial: persona.situacionActual || null,
        esVulnerable:      Boolean(persona.situacionActual),
        telefono:          persona.celular || null,
        fechaNacimiento:   persona.edad
          ? new Date(new Date().getFullYear() - parseInt(persona.edad), 0, 1)
          : null,
      },
    })
  }

  // 6. Registrar en historial
  await prisma.historialEstadoIncidencia.create({
    data: {
      idIncidencia:   incidenciaId,
      estadoAnterior: inc.estadoActual,
      estadoNuevo:    inc.estadoActual,
      motivoCambio:   'Datos del incidente actualizados',
    },
  })

  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
  redirect(`/grd/${incidenciaId}`)
}

// ─── Asignar brigadista ───────────────────────────────────────────────────────

export async function assignBrigadista(incidenciaId: string, brigadistaId: string) {
  await verifySession()

  // Evitar asignación duplicada del mismo brigadista
  const duplicate = await prisma.asignacionBrigadistaIncidencia.findFirst({
    where: { idIncidencia: incidenciaId, idBrigadistaParroquial: brigadistaId },
  })
  if (!duplicate) {
    await prisma.asignacionBrigadistaIncidencia.create({
      data: {
        idIncidencia:           incidenciaId,
        idBrigadistaParroquial: brigadistaId,
        estadoAsignacion:       'ASIGNADA',
        origenAsignacion:       'MANUAL',
        fechaAsignacion:        new Date(),
      },
    })
    // Marcar brigadista como ocupado
    await prisma.brigadistaParroquial.update({
      where: { idBrigadistaParroquial: brigadistaId },
      data:  { disponibilidad: 'EN CAMPO' },
    })
  }

  // Transicionar a ASIGNADO solo si viene de ABIERTO
  const inc = await prisma.incidencia.findUnique({
    where:  { idIncidencia: incidenciaId },
    select: { estadoActual: true },
  })
  if (inc?.estadoActual === 'ABIERTO') {
    await transicionEstado(incidenciaId, 'ASIGNADO', 'Brigadista asignado al incidente')
  }

  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Guardar levantamiento de campo ──────────────────────────────────────────

export async function saveInfoCampo(incidenciaId: string, data: {
  fechaVisita: string
  responsable: string
  descripcionEvento: string
  nivelVulnerabilidad: string
  necesidadesPrioritarias: string[]
  recomendacion: string
  observaciones?: string
  condHabitabilidad: Record<string, boolean>
}) {
  const session = await verifySession()

  // Nombre del usuario que llena el campo
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  })

  const dataConResponsable = { ...data, responsable: user?.name ?? data.responsable }

  await prisma.informe.create({
    data: {
      idIncidencia:  incidenciaId,
      tituloInforme: 'Levantamiento de campo',
      tipoInforme:   'CAMPO',
      resumen:       data.recomendacion,
      contenido:     JSON.stringify(dataConResponsable),
      estadoInforme: 'APROBADO',
    },
  })

  await transicionEstado(incidenciaId, 'DATA RECOPILADA', 'Levantamiento de campo completado')
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Guardar informe de evaluación ───────────────────────────────────────────

export async function saveInformeEvaluacion(incidenciaId: string, data: {
  analisisSituacion: string
  hallazgosTexto: string
  conclusiones: string
  nivelUrgencia: string
  tipoIntervencion: string
  recomendacionComite: string
}) {
  const session = await verifySession()
  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { name: true },
  })

  await prisma.informe.create({
    data: {
      idIncidencia:  incidenciaId,
      tituloInforme: 'Informe de Evaluación Social',
      tipoInforme:   'EVALUACION',
      resumen:       data.analisisSituacion,
      contenido:     JSON.stringify({ ...data, elaboradoPor: user?.name }),
      estadoInforme: 'BORRADOR',
    },
  })

  // Crear (o actualizar) la solicitud de ayuda humanitaria
  const solicitudExistente = await prisma.solicitudAyudaHumanitaria.findFirst({
    where: { idIncidencia: incidenciaId, estadoSolicitud: { not: 'RECHAZADA' } },
  })
  if (!solicitudExistente) {
    await prisma.solicitudAyudaHumanitaria.create({
      data: {
        idIncidencia:         incidenciaId,
        motivoSolicitud:      data.analisisSituacion,
        descripcionNecesidad: data.hallazgosTexto,
        tipoAyudaSolicitada:  data.tipoIntervencion,
        estadoSolicitud:      'EN_EVALUACION',
      },
    })
  } else {
    await prisma.solicitudAyudaHumanitaria.update({
      where: { idSolicitud: solicitudExistente.idSolicitud },
      data:  { estadoSolicitud: 'EN_EVALUACION', motivoSolicitud: data.analisisSituacion },
    })
  }

  await transicionEstado(incidenciaId, 'EN EVALUACION', 'Informe de evaluación enviado al Comité')
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Decisiones del Comité ────────────────────────────────────────────────────

export async function aprobarCaso(incidenciaId: string, observaciones?: string) {
  await verifySession()
  await prisma.solicitudAyudaHumanitaria.updateMany({
    where: { idIncidencia: incidenciaId, estadoSolicitud: 'EN_EVALUACION' },
    data:  { estadoSolicitud: 'APROBADA', resultadoEvaluacion: 'APROBADO', fechaEvaluacion: new Date() },
  })
  await transicionEstado(incidenciaId, 'APROBADO', 'Caso aprobado por el Comité', observaciones)
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

export async function observarCaso(incidenciaId: string, observaciones: string) {
  await verifySession()
  await prisma.solicitudAyudaHumanitaria.updateMany({
    where: { idIncidencia: incidenciaId, estadoSolicitud: 'EN_EVALUACION' },
    data:  { estadoSolicitud: 'EN_EVALUACION', observaciones },
  })
  await transicionEstado(incidenciaId, 'OBSERVADO', 'Caso devuelto con observaciones', observaciones)
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

export async function rechazarCaso(incidenciaId: string, observaciones: string) {
  await verifySession()
  await prisma.solicitudAyudaHumanitaria.updateMany({
    where: { idIncidencia: incidenciaId, estadoSolicitud: 'EN_EVALUACION' },
    data:  { estadoSolicitud: 'RECHAZADA', resultadoEvaluacion: 'RECHAZADO', observaciones },
  })
  await transicionEstado(incidenciaId, 'RECHAZADO', 'Caso rechazado por el Comité', observaciones)
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

export async function corregirYReenviar(incidenciaId: string, data: {
  analisisSituacion: string
  hallazgosTexto: string
  conclusiones: string
  recomendacionComite: string
}) {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })
  await prisma.informe.create({
    data: {
      idIncidencia:  incidenciaId,
      tituloInforme: 'Informe de Evaluación Social (corregido)',
      tipoInforme:   'EVALUACION',
      resumen:       data.analisisSituacion,
      contenido:     JSON.stringify({ ...data, elaboradoPor: user?.name }),
      estadoInforme: 'BORRADOR',
    },
  })
  await prisma.solicitudAyudaHumanitaria.updateMany({
    where: { idIncidencia: incidenciaId, estadoSolicitud: { not: 'RECHAZADA' } },
    data:  { estadoSolicitud: 'EN_EVALUACION' },
  })
  await transicionEstado(incidenciaId, 'EN EVALUACION', 'Informe corregido y reenviado al Comité')
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Registrar atención ───────────────────────────────────────────────────────

export async function registrarAtencion(incidenciaId: string, data: {
  tipoAyuda: string
  descripcionAyuda: string
  lugarEntrega: string
  observaciones?: string
}) {
  await verifySession()
  await prisma.entregaAyudaHumanitaria.create({
    data: {
      idIncidencia:         incidenciaId,
      tipoAyuda:            data.tipoAyuda,
      descripcionAyuda:     data.descripcionAyuda,
      lugarEntrega:         data.lugarEntrega,
      fechaEntrega:         new Date(),
      observaciones:        data.observaciones ?? null,
      entregaParcial:       false,
      conformidadRecepcion: true,
    },
  })
  await transicionEstado(incidenciaId, 'ATENDIDO', 'Ayuda humanitaria entregada')
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Seguimiento ──────────────────────────────────────────────────────────────

export async function addSeguimiento(incidenciaId: string, data: {
  situacion: string
  descripcion: string
  necesidadesPendientes?: string
  recomendaciones?: string
}) {
  await verifySession()
  await prisma.seguimientoIncidencia.create({
    data: {
      idIncidencia:          incidenciaId,
      situacion:             data.situacion,
      descripcion:           data.descripcion,
      necesidadesPendientes: data.necesidadesPendientes || null,
      recomendaciones:       data.recomendaciones || null,
      estado:                'ACTIVO',
    },
  })
  const inc = await prisma.incidencia.findUnique({
    where:  { idIncidencia: incidenciaId },
    select: { estadoActual: true },
  })
  if (inc?.estadoActual === 'ATENDIDO') {
    await transicionEstado(incidenciaId, 'SEGUIMIENTO ABIERTO', 'Inicio de seguimiento post-atención')
  }
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

// ─── Cerrar caso ──────────────────────────────────────────────────────────────

export async function cerrarCaso(incidenciaId: string) {
  await verifySession()
  // Liberar brigadistas y cerrar asignaciones
  const asignaciones = await prisma.asignacionBrigadistaIncidencia.findMany({
    where:  { idIncidencia: incidenciaId, estadoAsignacion: 'ASIGNADA' },
    select: { idBrigadistaParroquial: true, idAsignacionBrigadista: true },
  })
  for (const a of asignaciones) {
    await prisma.brigadistaParroquial.update({
      where: { idBrigadistaParroquial: a.idBrigadistaParroquial },
      data:  { disponibilidad: 'DISPONIBLE' },
    })
  }
  if (asignaciones.length) {
    await prisma.asignacionBrigadistaIncidencia.updateMany({
      where: { idIncidencia: incidenciaId, estadoAsignacion: 'ASIGNADA' },
      data:  { estadoAsignacion: 'CERRADA', fechaCierreCampo: new Date() },
    })
  }
  await transicionEstado(incidenciaId, 'CERRADO', 'Caso cerrado')
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}
