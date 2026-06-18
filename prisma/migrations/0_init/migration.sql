-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMINISTRADOR', 'ESPECIALISTAGRD', 'BRIGADISTA', 'COMITEDONACIONES', 'JEFAOGP');

-- CreateTable
CREATE TABLE "public"."accion_respuesta" (
    "idAccion" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "fechaAccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoAccion" TEXT,
    "descripcionAccion" TEXT,
    "resultado" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fechaSincronizacion" TIMESTAMP(3),
    "syncEstado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uuidMovil" TEXT,

    CONSTRAINT "accion_respuesta_pkey" PRIMARY KEY ("idAccion")
);

-- CreateTable
CREATE TABLE "public"."actividad_preventiva" (
    "idActividadPreventiva" TEXT NOT NULL,
    "idPlanTrabajoGRD" TEXT,
    "idParroquia" TEXT NOT NULL,
    "idBrigadistaResponsable" TEXT,
    "idUsuarioRegistroGRD" TEXT NOT NULL,
    "idTipoActividadPreventiva" TEXT NOT NULL,
    "codigoActividad" TEXT,
    "nombreActividad" TEXT NOT NULL,
    "fechaProgramada" TIMESTAMP(3),
    "fechaEjecucion" TIMESTAMP(3),
    "horarioInicio" TEXT,
    "horarioFin" TEXT,
    "lugarActividad" TEXT,
    "publicoObjetivo" TEXT,
    "numeroParticipantesEstimado" INTEGER,
    "numeroParticipantesReal" INTEGER,
    "descripcionActividad" TEXT,
    "resultadoGeneral" TEXT,
    "recomendaciones" TEXT,
    "observaciones" TEXT,
    "estadoActividad" TEXT NOT NULL DEFAULT 'PROGRAMADA',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "duracionSimulacro" TEXT,
    "idUsuarioResponsableGRD" TEXT,
    "indicacionesEquipo" TEXT,
    "reporteBrigadista" TEXT,

    CONSTRAINT "actividad_preventiva_pkey" PRIMARY KEY ("idActividadPreventiva")
);

-- CreateTable
CREATE TABLE "public"."asignacion_brigadista_incidencia" (
    "idAsignacionBrigadista" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idBrigadistaParroquial" TEXT NOT NULL,
    "idUsuarioAsignadorGRD" TEXT,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInicioCampo" TIMESTAMP(3),
    "fechaLlegadaCampo" TIMESTAMP(3),
    "fechaCierreCampo" TIMESTAMP(3),
    "estadoAsignacion" TEXT NOT NULL DEFAULT 'ASIGNADA',
    "rolEnEquipo" TEXT,
    "esResponsableEquipo" BOOLEAN NOT NULL DEFAULT false,
    "origenAsignacion" TEXT NOT NULL DEFAULT 'MANUAL',
    "puntajeAsignacion" DECIMAL(5,2),
    "criterioAsignacion" TEXT,
    "progresoEvidencias" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fechaSincronizacion" TIMESTAMP(3),
    "syncEstado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uuidMovil" TEXT,

    CONSTRAINT "asignacion_brigadista_incidencia_pkey" PRIMARY KEY ("idAsignacionBrigadista")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aviso_emergencia" (
    "idAviso" TEXT NOT NULL,
    "idParroquia" TEXT,
    "idUsuarioGRD" TEXT,
    "codigoAviso" TEXT,
    "medioAviso" TEXT,
    "fechaHoraAviso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "nombreInformante" TEXT,
    "telefonoInformante" TEXT,
    "direccionPreliminar" TEXT,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "estadoAviso" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "observaciones" TEXT,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "dniInformante" TEXT,
    "origenRegistro" TEXT DEFAULT 'WEB',
    "rolInformante" TEXT,

    CONSTRAINT "aviso_emergencia_pkey" PRIMARY KEY ("idAviso")
);

-- CreateTable
CREATE TABLE "public"."brigadista_parroquial" (
    "idBrigadistaParroquial" TEXT NOT NULL,
    "idParroquia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "idCertificacionCurso" TEXT,
    "dni" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT,
    "celular" TEXT,
    "correo" TEXT,
    "disponibilidad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brigadista_parroquial_pkey" PRIMARY KEY ("idBrigadistaParroquial")
);

-- CreateTable
CREATE TABLE "public"."catalogo_detalle_grd" (
    "idCatalogoDetalleGRD" TEXT NOT NULL,
    "idCatalogoGRD" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "catalogo_detalle_grd_pkey" PRIMARY KEY ("idCatalogoDetalleGRD")
);

-- CreateTable
CREATE TABLE "public"."catalogo_grd" (
    "idCatalogoGRD" TEXT NOT NULL,
    "nombreCatalogo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "catalogo_grd_pkey" PRIMARY KEY ("idCatalogoGRD")
);

-- CreateTable
CREATE TABLE "public"."catalogo_lugar" (
    "idLugar" TEXT NOT NULL,
    "idTipoLugar" TEXT NOT NULL,
    "idLugarPadre" TEXT,
    "nombreLugar" TEXT NOT NULL,
    "direccion" TEXT,
    "referencia" TEXT,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "telefono" TEXT,
    "correo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "catalogo_lugar_pkey" PRIMARY KEY ("idLugar")
);

-- CreateTable
CREATE TABLE "public"."certificacion_curso" (
    "idCertificacionCurso" TEXT NOT NULL,
    "idInscripcionCurso" TEXT NOT NULL,
    "estadoCertificacion" TEXT NOT NULL DEFAULT 'GENERADA',
    "fechaCertificacion" TIMESTAMP(3),
    "constanciaUrl" TEXT,
    "medioEnvioConstancia" TEXT,
    "observacion" TEXT,

    CONSTRAINT "certificacion_curso_pkey" PRIMARY KEY ("idCertificacionCurso")
);

-- CreateTable
CREATE TABLE "public"."credencial_modulo" (
    "idCredencialModulo" TEXT NOT NULL,
    "idCredencial" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credencial_modulo_pkey" PRIMARY KEY ("idCredencialModulo")
);

-- CreateTable
CREATE TABLE "public"."credencial_rol" (
    "idCredencialRol" TEXT NOT NULL,
    "idCredencial" TEXT NOT NULL,
    "idRol" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credencial_rol_pkey" PRIMARY KEY ("idCredencialRol")
);

-- CreateTable
CREATE TABLE "public"."cuestionario_curso" (
    "idCuestionarioCurso" TEXT NOT NULL,
    "idCursoCapacitacion" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoCuestionario" TEXT NOT NULL DEFAULT 'FINAL',
    "notaAprobatoria" DECIMAL(5,2) NOT NULL DEFAULT 11.00,
    "maxIntentos" INTEGER NOT NULL DEFAULT 3,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuestionario_curso_pkey" PRIMARY KEY ("idCuestionarioCurso")
);

-- CreateTable
CREATE TABLE "public"."curso_capacitacion" (
    "idCursoCapacitacion" TEXT NOT NULL,
    "idUsuarioResponsableGRD" TEXT NOT NULL,
    "idInstitucionAliada" TEXT,
    "codigoCurso" TEXT,
    "nombreCurso" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "duracionEstimadaHoras" INTEGER,
    "modalidadGeneral" TEXT NOT NULL DEFAULT 'ASINCRONA',
    "estadoCurso" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curso_capacitacion_pkey" PRIMARY KEY ("idCursoCapacitacion")
);

-- CreateTable
CREATE TABLE "public"."entrega_ayuda_humanitaria" (
    "idEntrega" TEXT NOT NULL,
    "idSolicitud" TEXT,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioResponsableGRD" TEXT,
    "codigoEntrega" TEXT,
    "fechaEntrega" TIMESTAMP(3),
    "lugarEntrega" TEXT,
    "tipoAyuda" TEXT,
    "descripcionAyuda" TEXT,
    "cantidadEntregada" INTEGER,
    "conformidadRecepcion" BOOLEAN,
    "entregaParcial" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "idGrupoFamiliar" TEXT,
    "idPersonaAfectada" TEXT,
    "uuidAfectadoMovil" TEXT,

    CONSTRAINT "entrega_ayuda_humanitaria_pkey" PRIMARY KEY ("idEntrega")
);

-- CreateTable
CREATE TABLE "public"."evaluacion_curso" (
    "idEvaluacionCurso" TEXT NOT NULL,
    "idInscripcionCurso" TEXT NOT NULL,
    "tipoEvaluacion" TEXT,
    "numeroIntento" INTEGER NOT NULL DEFAULT 1,
    "nota" DECIMAL(5,2),
    "resultado" TEXT,
    "fechaEvaluacion" TIMESTAMP(3),
    "observacion" TEXT,
    "idCuestionarioCurso" TEXT,
    "porcentajeObtenido" DECIMAL(5,2),
    "puntajeObtenido" DECIMAL(5,2),
    "puntajeTotal" DECIMAL(5,2),

    CONSTRAINT "evaluacion_curso_pkey" PRIMARY KEY ("idEvaluacionCurso")
);

-- CreateTable
CREATE TABLE "public"."evidencia_grd" (
    "idEvidenciaGRD" TEXT NOT NULL,
    "idTipoReferencia" TEXT NOT NULL,
    "idReferencia" TEXT NOT NULL,
    "idUsuarioCargaGRD" TEXT NOT NULL,
    "idTipoEvidencia" TEXT,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "formatoArchivo" TEXT,
    "descripcion" TEXT,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tamanoArchivo" INTEGER,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "evidencia_grd_pkey" PRIMARY KEY ("idEvidenciaGRD")
);

-- CreateTable
CREATE TABLE "public"."grupo_familiar_afectado" (
    "idGrupoFamiliar" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "codigoGrupo" TEXT,
    "nombreReferencia" TEXT,
    "direccion" TEXT,
    "condicionVivienda" TEXT,
    "condicionFinal" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fechaSincronizacion" TIMESTAMP(3),
    "syncEstado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uuidMovil" TEXT,

    CONSTRAINT "grupo_familiar_afectado_pkey" PRIMARY KEY ("idGrupoFamiliar")
);

-- CreateTable
CREATE TABLE "public"."historial_auditoria_grd" (
    "idAuditoriaGRD" TEXT NOT NULL,
    "idTipoReferencia" TEXT NOT NULL,
    "idReferencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "idTipoAccion" TEXT,
    "campoModificado" TEXT,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipOrigen" TEXT,
    "modulo" TEXT,
    "observacion" TEXT,

    CONSTRAINT "historial_auditoria_grd_pkey" PRIMARY KEY ("idAuditoriaGRD")
);

-- CreateTable
CREATE TABLE "public"."historial_estado_incidencia" (
    "idHistorial" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT NOT NULL,
    "motivoCambio" TEXT,
    "observaciones" TEXT,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fechaSincronizacion" TIMESTAMP(3),
    "syncEstado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uuidMovil" TEXT,

    CONSTRAINT "historial_estado_incidencia_pkey" PRIMARY KEY ("idHistorial")
);

-- CreateTable
CREATE TABLE "public"."incidencia" (
    "idIncidencia" TEXT NOT NULL,
    "idAviso" TEXT,
    "idParroquia" TEXT,
    "idUsuarioResponsableGRD" TEXT,
    "codigoCaso" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tituloIncidencia" TEXT,
    "relatoActual" TEXT,
    "direccionEvento" TEXT,
    "contextoCaso" TEXT,
    "tipoEvento" TEXT,
    "descripcionEvento" TEXT,
    "gravedad" TEXT,
    "estadoActual" TEXT NOT NULL DEFAULT 'REGISTRADA',
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "observacionesGenerales" TEXT,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "causaEvento" TEXT,
    "distritoEvento" TEXT,
    "fechaSuceso" TIMESTAMP(3),
    "horaSuceso" TEXT,
    "necesidades" TEXT,
    "necesidadesObs" TEXT,
    "numAfectadosReportado" INTEGER,
    "origenRegistro" TEXT DEFAULT 'WEB',
    "parroquiaNombreSnapshot" TEXT,
    "referenciaEvento" TEXT,
    "reportadoPorCelular" TEXT,
    "reportadoPorDni" TEXT,
    "reportadoPorNombre" TEXT,
    "reportadoPorRol" TEXT,

    CONSTRAINT "incidencia_pkey" PRIMARY KEY ("idIncidencia")
);

-- CreateTable
CREATE TABLE "public"."informe" (
    "idInforme" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "tituloInforme" TEXT NOT NULL,
    "tipoInforme" TEXT,
    "fechaElaboracion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumen" TEXT,
    "contenido" TEXT,
    "urlDocumento" TEXT,
    "estadoInforme" TEXT NOT NULL DEFAULT 'BORRADOR',

    CONSTRAINT "informe_pkey" PRIMARY KEY ("idInforme")
);

-- CreateTable
CREATE TABLE "public"."inscripcion_curso" (
    "idInscripcionCurso" TEXT NOT NULL,
    "idCursoCapacitacion" TEXT NOT NULL,
    "idParticipante" TEXT NOT NULL,
    "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInicioContenido" TIMESTAMP(3),
    "fechaFinalizacionContenido" TIMESTAMP(3),
    "estadoInscripcion" TEXT NOT NULL DEFAULT 'INSCRITO',
    "canalComunicacion" TEXT,
    "observacion" TEXT,

    CONSTRAINT "inscripcion_curso_pkey" PRIMARY KEY ("idInscripcionCurso")
);

-- CreateTable
CREATE TABLE "public"."institucion_aliada" (
    "idInstitucionAliada" TEXT NOT NULL,
    "nombreInstitucion" TEXT NOT NULL,
    "tipoInstitucion" TEXT,
    "personaContacto" TEXT,
    "correoContacto" TEXT,
    "telefonoContacto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institucion_aliada_pkey" PRIMARY KEY ("idInstitucionAliada")
);

-- CreateTable
CREATE TABLE "public"."intento_login" (
    "idIntento" TEXT NOT NULL,
    "idCredencial" TEXT,
    "correo" TEXT NOT NULL,
    "ipOrigen" TEXT,
    "exitoso" BOOLEAN NOT NULL DEFAULT false,
    "motivoFallo" TEXT,
    "fechaIntento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intento_login_pkey" PRIMARY KEY ("idIntento")
);

-- CreateTable
CREATE TABLE "public"."kit_articulo" (
    "idKitArticulo" TEXT NOT NULL,
    "idKitEmergencia" TEXT NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kit_articulo_pkey" PRIMARY KEY ("idKitArticulo")
);

-- CreateTable
CREATE TABLE "public"."kit_emergencia" (
    "idKitEmergencia" TEXT NOT NULL,
    "idParroquiaBeneficiaria" TEXT,
    "codigoAlmacen" TEXT,
    "tipoKit" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "estadoKit" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ubicacionAlmacen" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "kit_emergencia_pkey" PRIMARY KEY ("idKitEmergencia")
);

-- CreateTable
CREATE TABLE "public"."material_capacitacion" (
    "idMaterialCapacitacion" TEXT NOT NULL,
    "idCursoCapacitacion" TEXT NOT NULL,
    "idUnidadContenido" TEXT,
    "titulo" TEXT NOT NULL,
    "tipoMaterial" TEXT,
    "enlaceMaterial" TEXT,
    "descripcion" TEXT,
    "categoria" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "material_capacitacion_pkey" PRIMARY KEY ("idMaterialCapacitacion")
);

-- CreateTable
CREATE TABLE "public"."movimiento_kit" (
    "idMovimientoKit" TEXT NOT NULL,
    "idKitEmergencia" TEXT NOT NULL,
    "idUsuarioResponsableGRD" TEXT NOT NULL,
    "idParroquiaDestino" TEXT,
    "idActividadPreventiva" TEXT,
    "tipoMovimiento" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivoMovimiento" TEXT,
    "observaciones" TEXT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "movimiento_kit_pkey" PRIMARY KEY ("idMovimientoKit")
);

-- CreateTable
CREATE TABLE "public"."notificaciones" (
    "idNotificacion" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enlace" VARCHAR(500),
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("idNotificacion")
);

-- CreateTable
CREATE TABLE "public"."observacion_grd" (
    "idObservacionGRD" TEXT NOT NULL,
    "idTipoReferencia" TEXT NOT NULL,
    "idReferencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT NOT NULL,
    "textoObservacion" TEXT NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "observacion_grd_pkey" PRIMARY KEY ("idObservacionGRD")
);

-- CreateTable
CREATE TABLE "public"."observacion_simulacro" (
    "idObservacion" TEXT NOT NULL,
    "idActividadPreventiva" TEXT NOT NULL,
    "idUsuarioGRD" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEdicion" TIMESTAMP(3),

    CONSTRAINT "observacion_simulacro_pkey" PRIMARY KEY ("idObservacion")
);

-- CreateTable
CREATE TABLE "public"."opcion_pregunta" (
    "idOpcionPregunta" TEXT NOT NULL,
    "idPreguntaCuestionario" TEXT NOT NULL,
    "textoOpcion" TEXT NOT NULL,
    "esCorrecta" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "opcion_pregunta_pkey" PRIMARY KEY ("idOpcionPregunta")
);

-- CreateTable
CREATE TABLE "public"."parroquia" (
    "idParroquia" TEXT NOT NULL,
    "idLugarCatalogo" TEXT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "referencia" TEXT,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "telefono" TEXT,
    "correo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "parroquia_pkey" PRIMARY KEY ("idParroquia")
);

-- CreateTable
CREATE TABLE "public"."participante" (
    "idParticipante" TEXT NOT NULL,
    "idParroquia" TEXT,
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT,
    "edad" INTEGER,
    "celular" TEXT,
    "correo" TEXT,
    "rolPastoralComunitario" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "participante_pkey" PRIMARY KEY ("idParticipante")
);

-- CreateTable
CREATE TABLE "public"."permiso" (
    "idPermiso" TEXT NOT NULL,
    "idRecursoAPI" TEXT NOT NULL,
    "codigoPermiso" TEXT NOT NULL,
    "nombrePermiso" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("idPermiso")
);

-- CreateTable
CREATE TABLE "public"."persona_afectada" (
    "idPersonaAfectada" TEXT NOT NULL,
    "idGrupoFamiliar" TEXT NOT NULL,
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "sexo" TEXT,
    "parentesco" TEXT,
    "condicionSalud" TEXT,
    "condicionEspecial" TEXT,
    "esVulnerable" BOOLEAN NOT NULL DEFAULT false,
    "telefono" TEXT,
    "observaciones" TEXT,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "persona_afectada_pkey" PRIMARY KEY ("idPersonaAfectada")
);

-- CreateTable
CREATE TABLE "public"."plan_trabajo_grd" (
    "idPlanTrabajoGRD" TEXT NOT NULL,
    "idParroquia" TEXT NOT NULL,
    "idUsuarioResponsableGRD" TEXT NOT NULL,
    "codigoPlan" TEXT,
    "nombrePlan" TEXT NOT NULL,
    "diagnosticoRiesgo" TEXT,
    "objetivos" TEXT,
    "actividadesGenerales" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "rutasEvacuacion" TEXT,
    "zonasSeguras" TEXT,
    "estadoAprobacion" TEXT NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,

    CONSTRAINT "plan_trabajo_grd_pkey" PRIMARY KEY ("idPlanTrabajoGRD")
);

-- CreateTable
CREATE TABLE "public"."pregunta_cuestionario" (
    "idPreguntaCuestionario" TEXT NOT NULL,
    "idCuestionarioCurso" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "tipoPregunta" TEXT NOT NULL DEFAULT 'OPCION_UNICA',
    "puntaje" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "orden" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "pregunta_cuestionario_pkey" PRIMARY KEY ("idPreguntaCuestionario")
);

-- CreateTable
CREATE TABLE "public"."progreso_capacitacion" (
    "idProgresoCapacitacion" TEXT NOT NULL,
    "idInscripcionCurso" TEXT NOT NULL,
    "idUnidadContenido" TEXT,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "estadoProgreso" TEXT NOT NULL DEFAULT 'NO_INICIADO',
    "fechaInicio" TIMESTAMP(3),
    "fechaUltimoAcceso" TIMESTAMP(3),
    "fechaCompletado" TIMESTAMP(3),
    "observacion" TEXT,

    CONSTRAINT "progreso_capacitacion_pkey" PRIMARY KEY ("idProgresoCapacitacion")
);

-- CreateTable
CREATE TABLE "public"."recuperacion_contrasena" (
    "idRecuperacion" TEXT NOT NULL,
    "idCredencial" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "ipSolicitud" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3) NOT NULL,
    "fechaUso" TIMESTAMP(3),

    CONSTRAINT "recuperacion_contrasena_pkey" PRIMARY KEY ("idRecuperacion")
);

-- CreateTable
CREATE TABLE "public"."recurso_api" (
    "idRecursoAPI" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificadorURI" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "recurso_api_pkey" PRIMARY KEY ("idRecursoAPI")
);

-- CreateTable
CREATE TABLE "public"."respuesta_evaluacion" (
    "idRespuestaEvaluacion" TEXT NOT NULL,
    "idEvaluacionCurso" TEXT NOT NULL,
    "idPreguntaCuestionario" TEXT NOT NULL,
    "idOpcionPregunta" TEXT,
    "respuestaTexto" TEXT,
    "esCorrecta" BOOLEAN,
    "puntajeObtenido" DECIMAL(5,2),
    "fechaRespuesta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuesta_evaluacion_pkey" PRIMARY KEY ("idRespuestaEvaluacion")
);

-- CreateTable
CREATE TABLE "public"."rol" (
    "idRol" TEXT NOT NULL,
    "nombreRol" TEXT NOT NULL,
    "descripcion" TEXT,
    "modulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("idRol")
);

-- CreateTable
CREATE TABLE "public"."rol_permiso" (
    "idRolPermiso" TEXT NOT NULL,
    "idRol" TEXT NOT NULL,
    "idPermiso" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("idRolPermiso")
);

-- CreateTable
CREATE TABLE "public"."seguimiento_incidencia" (
    "idSeguimiento" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioGRD" TEXT,
    "fechaSeguimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situacion" TEXT,
    "descripcion" TEXT,
    "necesidadesPendientes" TEXT,
    "recomendaciones" TEXT,
    "estado" TEXT,
    "observaciones" TEXT,
    "uuidMovil" TEXT,
    "syncEstado" TEXT,
    "fechaSincronizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "seguimiento_incidencia_pkey" PRIMARY KEY ("idSeguimiento")
);

-- CreateTable
CREATE TABLE "public"."sesion" (
    "idSesion" TEXT NOT NULL,
    "idCredencial" TEXT NOT NULL,
    "moduloActivo" TEXT NOT NULL,
    "tokenJWT" TEXT,
    "refreshToken" TEXT,
    "ipOrigen" TEXT,
    "dispositivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3),

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("idSesion")
);

-- CreateTable
CREATE TABLE "public"."simulacro_brigadista" (
    "idSimulacroBrigadista" TEXT NOT NULL,
    "idActividadPreventiva" TEXT NOT NULL,
    "idBrigadistaParroquial" TEXT NOT NULL,
    "idUsuarioAsignadorGRD" TEXT,
    "esResponsable" BOOLEAN NOT NULL DEFAULT false,
    "estadoAsignacion" TEXT NOT NULL DEFAULT 'ASIGNADA',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacro_brigadista_pkey" PRIMARY KEY ("idSimulacroBrigadista")
);

-- CreateTable
CREATE TABLE "public"."solicitud_ayuda_humanitaria" (
    "idSolicitud" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "idUsuarioSolicitanteGRD" TEXT,
    "idUsuarioEvaluadorGRD" TEXT,
    "codigoSolicitud" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivoSolicitud" TEXT,
    "tipoAyudaSolicitada" TEXT,
    "descripcionNecesidad" TEXT,
    "estadoSolicitud" TEXT NOT NULL DEFAULT 'REGISTRADA',
    "resultadoEvaluacion" TEXT,
    "fechaEvaluacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fechaSincronizacion" TIMESTAMP(3),
    "idGrupoFamiliar" TEXT,
    "idPersonaAfectada" TEXT,
    "syncEstado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uuidAfectadoMovil" TEXT,
    "uuidMovil" TEXT,

    CONSTRAINT "solicitud_ayuda_humanitaria_pkey" PRIMARY KEY ("idSolicitud")
);

-- CreateTable
CREATE TABLE "public"."tipo_lugar" (
    "idTipoLugar" TEXT NOT NULL,
    "codigoTipoLugar" TEXT NOT NULL,
    "nombreTipoLugar" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tipo_lugar_pkey" PRIMARY KEY ("idTipoLugar")
);

-- CreateTable
CREATE TABLE "public"."tipo_referencia" (
    "idTipoReferencia" TEXT NOT NULL,
    "codigoEntidad" TEXT NOT NULL,
    "nombreEntidad" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tipo_referencia_pkey" PRIMARY KEY ("idTipoReferencia")
);

-- CreateTable
CREATE TABLE "public"."unidad_contenido" (
    "idUnidadContenido" TEXT NOT NULL,
    "idCursoCapacitacion" TEXT NOT NULL,
    "numeroOrden" INTEGER NOT NULL,
    "tituloUnidad" TEXT NOT NULL,
    "descripcion" TEXT,
    "duracionEstimadaMinutos" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "unidad_contenido_pkey" PRIMARY KEY ("idUnidadContenido")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'BRIGADISTA',
    "resetPasswordToken" TEXT,
    "resetPasswordExpiry" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuario_grd" (
    "idUsuarioGRD" TEXT NOT NULL,
    "idCredencial" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "correoReferencia" TEXT,
    "telefono" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_grd_pkey" PRIMARY KEY ("idUsuarioGRD")
);

-- CreateIndex
CREATE UNIQUE INDEX "accion_respuesta_uuidMovil_key" ON "public"."accion_respuesta"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_accion_incidencia_fecha" ON "public"."accion_respuesta"("idIncidencia" ASC, "fechaAccion" ASC);

-- CreateIndex
CREATE INDEX "idx_accion_tipo_fecha" ON "public"."accion_respuesta"("tipoAccion" ASC, "fechaAccion" ASC);

-- CreateIndex
CREATE INDEX "idx_accion_usuario_fecha" ON "public"."accion_respuesta"("idUsuarioGRD" ASC, "fechaAccion" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "actividad_preventiva_codigoActividad_key" ON "public"."actividad_preventiva"("codigoActividad" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "actividad_preventiva_uuidMovil_key" ON "public"."actividad_preventiva"("uuidMovil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_brigadista_incidencia_uuidMovil_key" ON "public"."asignacion_brigadista_incidencia"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_asig_brigadista_estado" ON "public"."asignacion_brigadista_incidencia"("idBrigadistaParroquial" ASC, "estadoAsignacion" ASC);

-- CreateIndex
CREATE INDEX "idx_asig_fecha" ON "public"."asignacion_brigadista_incidencia"("fechaAsignacion" ASC);

-- CreateIndex
CREATE INDEX "idx_asig_incidencia_estado" ON "public"."asignacion_brigadista_incidencia"("idIncidencia" ASC, "estadoAsignacion" ASC);

-- CreateIndex
CREATE INDEX "idx_asig_usuario_fecha" ON "public"."asignacion_brigadista_incidencia"("idUsuarioAsignadorGRD" ASC, "fechaAsignacion" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "aviso_emergencia_codigoAviso_key" ON "public"."aviso_emergencia"("codigoAviso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "aviso_emergencia_uuidMovil_key" ON "public"."aviso_emergencia"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_aviso_dni_informante" ON "public"."aviso_emergencia"("dniInformante" ASC);

-- CreateIndex
CREATE INDEX "idx_aviso_estado_fecha" ON "public"."aviso_emergencia"("estadoAviso" ASC, "fechaHoraAviso" ASC);

-- CreateIndex
CREATE INDEX "idx_aviso_origen" ON "public"."aviso_emergencia"("origenRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_aviso_parroquia_estado" ON "public"."aviso_emergencia"("idParroquia" ASC, "estadoAviso" ASC);

-- CreateIndex
CREATE INDEX "idx_aviso_usuario_fecha" ON "public"."aviso_emergencia"("idUsuarioGRD" ASC, "fechaHoraAviso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "brigadista_parroquial_dni_key" ON "public"."brigadista_parroquial"("dni" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "brigadista_parroquial_idCertificacionCurso_key" ON "public"."brigadista_parroquial"("idCertificacionCurso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "brigadista_parroquial_idUsuarioGRD_key" ON "public"."brigadista_parroquial"("idUsuarioGRD" ASC);

-- CreateIndex
CREATE INDEX "idx_brigadista_estado_disp" ON "public"."brigadista_parroquial"("estado" ASC, "disponibilidad" ASC);

-- CreateIndex
CREATE INDEX "idx_brigadista_fecha" ON "public"."brigadista_parroquial"("fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_brigadista_parroquia_disp" ON "public"."brigadista_parroquial"("idParroquia" ASC, "disponibilidad" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_detalle_grd_idCatalogoGRD_codigo_key" ON "public"."catalogo_detalle_grd"("idCatalogoGRD" ASC, "codigo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_grd_nombreCatalogo_key" ON "public"."catalogo_grd"("nombreCatalogo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "certificacion_curso_idInscripcionCurso_key" ON "public"."certificacion_curso"("idInscripcionCurso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "credencial_modulo_idCredencial_modulo_key" ON "public"."credencial_modulo"("idCredencial" ASC, "modulo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "credencial_rol_idCredencial_idRol_key" ON "public"."credencial_rol"("idCredencial" ASC, "idRol" ASC);

-- CreateIndex
CREATE INDEX "cuestionario_curso_idCursoCapacitacion_estado_idx" ON "public"."cuestionario_curso"("idCursoCapacitacion" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "curso_capacitacion_codigoCurso_key" ON "public"."curso_capacitacion"("codigoCurso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "entrega_ayuda_humanitaria_codigoEntrega_key" ON "public"."entrega_ayuda_humanitaria"("codigoEntrega" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "entrega_ayuda_humanitaria_uuidMovil_key" ON "public"."entrega_ayuda_humanitaria"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_grupo_familiar" ON "public"."entrega_ayuda_humanitaria"("idGrupoFamiliar" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_incidencia_fecha" ON "public"."entrega_ayuda_humanitaria"("idIncidencia" ASC, "fechaEntrega" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_persona_afectada" ON "public"."entrega_ayuda_humanitaria"("idPersonaAfectada" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_responsable_fecha" ON "public"."entrega_ayuda_humanitaria"("idUsuarioResponsableGRD" ASC, "fechaEntrega" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_solicitud_fecha" ON "public"."entrega_ayuda_humanitaria"("idSolicitud" ASC, "fechaEntrega" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_tipo_fecha" ON "public"."entrega_ayuda_humanitaria"("tipoAyuda" ASC, "fechaEntrega" ASC);

-- CreateIndex
CREATE INDEX "idx_entrega_uuid_afectado_movil" ON "public"."entrega_ayuda_humanitaria"("uuidAfectadoMovil" ASC);

-- CreateIndex
CREATE INDEX "evaluacion_curso_idCuestionarioCurso_idx" ON "public"."evaluacion_curso"("idCuestionarioCurso" ASC);

-- CreateIndex
CREATE INDEX "evaluacion_curso_idInscripcionCurso_numeroIntento_idx" ON "public"."evaluacion_curso"("idInscripcionCurso" ASC, "numeroIntento" ASC);

-- CreateIndex
CREATE INDEX "evidencia_grd_idTipoReferencia_idReferencia_idx" ON "public"."evidencia_grd"("idTipoReferencia" ASC, "idReferencia" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_grd_uuidMovil_key" ON "public"."evidencia_grd"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_evidencia_estado_fecha" ON "public"."evidencia_grd"("estado" ASC, "fechaCarga" ASC);

-- CreateIndex
CREATE INDEX "idx_evidencia_tipo_fecha" ON "public"."evidencia_grd"("idTipoEvidencia" ASC, "fechaCarga" ASC);

-- CreateIndex
CREATE INDEX "idx_evidencia_usuario_fecha" ON "public"."evidencia_grd"("idUsuarioCargaGRD" ASC, "fechaCarga" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "grupo_familiar_afectado_uuidMovil_key" ON "public"."grupo_familiar_afectado"("uuidMovil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "grupo_familiar_incidencia_codigo_key" ON "public"."grupo_familiar_afectado"("idIncidencia" ASC, "codigoGrupo" ASC);

-- CreateIndex
CREATE INDEX "idx_grupo_familiar_incidencia" ON "public"."grupo_familiar_afectado"("idIncidencia" ASC);

-- CreateIndex
CREATE INDEX "historial_auditoria_grd_idTipoReferencia_idReferencia_idx" ON "public"."historial_auditoria_grd"("idTipoReferencia" ASC, "idReferencia" ASC);

-- CreateIndex
CREATE INDEX "idx_auditoria_accion_fecha" ON "public"."historial_auditoria_grd"("idTipoAccion" ASC, "fechaHora" ASC);

-- CreateIndex
CREATE INDEX "idx_auditoria_modulo_fecha" ON "public"."historial_auditoria_grd"("modulo" ASC, "fechaHora" ASC);

-- CreateIndex
CREATE INDEX "idx_auditoria_usuario_fecha" ON "public"."historial_auditoria_grd"("idUsuarioGRD" ASC, "fechaHora" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "historial_estado_incidencia_uuidMovil_key" ON "public"."historial_estado_incidencia"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_hist_estado_incidencia_fecha" ON "public"."historial_estado_incidencia"("idIncidencia" ASC, "fechaCambio" ASC);

-- CreateIndex
CREATE INDEX "idx_hist_estado_nuevo_fecha" ON "public"."historial_estado_incidencia"("estadoNuevo" ASC, "fechaCambio" ASC);

-- CreateIndex
CREATE INDEX "idx_hist_estado_usuario_fecha" ON "public"."historial_estado_incidencia"("idUsuarioGRD" ASC, "fechaCambio" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_aviso" ON "public"."incidencia"("idAviso" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_distrito" ON "public"."incidencia"("distritoEvento" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_estado_fecha" ON "public"."incidencia"("estadoActual" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_fecha" ON "public"."incidencia"("fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_fecha_suceso" ON "public"."incidencia"("fechaSuceso" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_gravedad_fecha" ON "public"."incidencia"("gravedad" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_origen" ON "public"."incidencia"("origenRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_parroquia_estado_fecha" ON "public"."incidencia"("idParroquia" ASC, "estadoActual" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_reportante_dni" ON "public"."incidencia"("reportadoPorDni" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_responsable_estado_fecha" ON "public"."incidencia"("idUsuarioResponsableGRD" ASC, "estadoActual" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_incidencia_tipo_fecha" ON "public"."incidencia"("tipoEvento" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "incidencia_codigoCaso_key" ON "public"."incidencia"("codigoCaso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "incidencia_uuidMovil_key" ON "public"."incidencia"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_informe_estado_fecha" ON "public"."informe"("estadoInforme" ASC, "fechaElaboracion" ASC);

-- CreateIndex
CREATE INDEX "idx_informe_incidencia" ON "public"."informe"("idIncidencia" ASC);

-- CreateIndex
CREATE INDEX "idx_informe_tipo_fecha" ON "public"."informe"("tipoInforme" ASC, "fechaElaboracion" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inscripcion_curso_idCursoCapacitacion_idParticipante_key" ON "public"."inscripcion_curso"("idCursoCapacitacion" ASC, "idParticipante" ASC);

-- CreateIndex
CREATE INDEX "idx_kit_articulo_kit" ON "public"."kit_articulo"("idKitEmergencia" ASC);

-- CreateIndex
CREATE INDEX "idx_kit_estado_fecha" ON "public"."kit_emergencia"("estadoKit" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_kit_parroquia" ON "public"."kit_emergencia"("idParroquiaBeneficiaria" ASC);

-- CreateIndex
CREATE INDEX "idx_kit_tipo_estado" ON "public"."kit_emergencia"("tipoKit" ASC, "estadoKit" ASC);

-- CreateIndex
CREATE INDEX "idx_movimiento_actividad" ON "public"."movimiento_kit"("idActividadPreventiva" ASC);

-- CreateIndex
CREATE INDEX "idx_movimiento_kit_fecha" ON "public"."movimiento_kit"("idKitEmergencia" ASC, "fechaMovimiento" ASC);

-- CreateIndex
CREATE INDEX "idx_movimiento_parroquia_fecha" ON "public"."movimiento_kit"("idParroquiaDestino" ASC, "fechaMovimiento" ASC);

-- CreateIndex
CREATE INDEX "idx_movimiento_tipo_fecha" ON "public"."movimiento_kit"("tipoMovimiento" ASC, "fechaMovimiento" ASC);

-- CreateIndex
CREATE INDEX "idx_movimiento_usuario_fecha" ON "public"."movimiento_kit"("idUsuarioResponsableGRD" ASC, "fechaMovimiento" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_kit_uuidMovil_key" ON "public"."movimiento_kit"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_notif_user_leida_fecha" ON "public"."notificaciones"("userId" ASC, "leida" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "idx_observacion_estado_fecha" ON "public"."observacion_grd"("estado" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "idx_observacion_usuario_fecha" ON "public"."observacion_grd"("idUsuarioGRD" ASC, "fechaRegistro" ASC);

-- CreateIndex
CREATE INDEX "observacion_grd_idTipoReferencia_idReferencia_idx" ON "public"."observacion_grd"("idTipoReferencia" ASC, "idReferencia" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "observacion_grd_uuidMovil_key" ON "public"."observacion_grd"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "opcion_pregunta_idPreguntaCuestionario_estado_idx" ON "public"."opcion_pregunta"("idPreguntaCuestionario" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "opcion_pregunta_idPreguntaCuestionario_orden_key" ON "public"."opcion_pregunta"("idPreguntaCuestionario" ASC, "orden" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "parroquia_idLugarCatalogo_key" ON "public"."parroquia"("idLugarCatalogo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "participante_tipoDocumento_numeroDocumento_key" ON "public"."participante"("tipoDocumento" ASC, "numeroDocumento" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "permiso_idRecursoAPI_codigoPermiso_key" ON "public"."permiso"("idRecursoAPI" ASC, "codigoPermiso" ASC);

-- CreateIndex
CREATE INDEX "idx_persona_afectada_documento" ON "public"."persona_afectada"("numeroDocumento" ASC);

-- CreateIndex
CREATE INDEX "idx_persona_afectada_grupo" ON "public"."persona_afectada"("idGrupoFamiliar" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "persona_afectada_uuidMovil_key" ON "public"."persona_afectada"("uuidMovil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "plan_trabajo_grd_codigoPlan_key" ON "public"."plan_trabajo_grd"("codigoPlan" ASC);

-- CreateIndex
CREATE INDEX "pregunta_cuestionario_idCuestionarioCurso_estado_idx" ON "public"."pregunta_cuestionario"("idCuestionarioCurso" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pregunta_cuestionario_idCuestionarioCurso_orden_key" ON "public"."pregunta_cuestionario"("idCuestionarioCurso" ASC, "orden" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "progreso_capacitacion_idInscripcionCurso_idUnidadContenido_key" ON "public"."progreso_capacitacion"("idInscripcionCurso" ASC, "idUnidadContenido" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recuperacion_contrasena_token_key" ON "public"."recuperacion_contrasena"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recurso_api_identificadorURI_key" ON "public"."recurso_api"("identificadorURI" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_evaluacion_idEvaluacionCurso_idPreguntaCuestionar_key" ON "public"."respuesta_evaluacion"("idEvaluacionCurso" ASC, "idPreguntaCuestionario" ASC);

-- CreateIndex
CREATE INDEX "respuesta_evaluacion_idEvaluacionCurso_idx" ON "public"."respuesta_evaluacion"("idEvaluacionCurso" ASC);

-- CreateIndex
CREATE INDEX "respuesta_evaluacion_idOpcionPregunta_idx" ON "public"."respuesta_evaluacion"("idOpcionPregunta" ASC);

-- CreateIndex
CREATE INDEX "respuesta_evaluacion_idPreguntaCuestionario_idx" ON "public"."respuesta_evaluacion"("idPreguntaCuestionario" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombreRol_modulo_key" ON "public"."rol"("nombreRol" ASC, "modulo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rol_permiso_idRol_idPermiso_key" ON "public"."rol_permiso"("idRol" ASC, "idPermiso" ASC);

-- CreateIndex
CREATE INDEX "idx_seguimiento_estado_fecha" ON "public"."seguimiento_incidencia"("estado" ASC, "fechaSeguimiento" ASC);

-- CreateIndex
CREATE INDEX "idx_seguimiento_incidencia_fecha" ON "public"."seguimiento_incidencia"("idIncidencia" ASC, "fechaSeguimiento" ASC);

-- CreateIndex
CREATE INDEX "idx_seguimiento_usuario_fecha" ON "public"."seguimiento_incidencia"("idUsuarioGRD" ASC, "fechaSeguimiento" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "seguimiento_incidencia_uuidMovil_key" ON "public"."seguimiento_incidencia"("uuidMovil" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_estado_fecha" ON "public"."solicitud_ayuda_humanitaria"("estadoSolicitud" ASC, "fechaSolicitud" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_evaluador_fecha" ON "public"."solicitud_ayuda_humanitaria"("idUsuarioEvaluadorGRD" ASC, "fechaEvaluacion" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_grupo_familiar" ON "public"."solicitud_ayuda_humanitaria"("idGrupoFamiliar" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_incidencia_estado" ON "public"."solicitud_ayuda_humanitaria"("idIncidencia" ASC, "estadoSolicitud" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_persona_afectada" ON "public"."solicitud_ayuda_humanitaria"("idPersonaAfectada" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_solicitante_fecha" ON "public"."solicitud_ayuda_humanitaria"("idUsuarioSolicitanteGRD" ASC, "fechaSolicitud" ASC);

-- CreateIndex
CREATE INDEX "idx_solicitud_uuid_afectado_movil" ON "public"."solicitud_ayuda_humanitaria"("uuidAfectadoMovil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_ayuda_humanitaria_codigoSolicitud_key" ON "public"."solicitud_ayuda_humanitaria"("codigoSolicitud" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_ayuda_humanitaria_uuidMovil_key" ON "public"."solicitud_ayuda_humanitaria"("uuidMovil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_lugar_codigoTipoLugar_key" ON "public"."tipo_lugar"("codigoTipoLugar" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_referencia_codigoEntidad_key" ON "public"."tipo_referencia"("codigoEntidad" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unidad_contenido_idCursoCapacitacion_numeroOrden_key" ON "public"."unidad_contenido"("idCursoCapacitacion" ASC, "numeroOrden" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordToken_key" ON "public"."users"("resetPasswordToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_grd_idCredencial_key" ON "public"."usuario_grd"("idCredencial" ASC);

-- AddForeignKey
ALTER TABLE "public"."accion_respuesta" ADD CONSTRAINT "accion_respuesta_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."actividad_preventiva" ADD CONSTRAINT "actividad_preventiva_idBrigadistaResponsable_fkey" FOREIGN KEY ("idBrigadistaResponsable") REFERENCES "public"."brigadista_parroquial"("idBrigadistaParroquial") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."actividad_preventiva" ADD CONSTRAINT "actividad_preventiva_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."actividad_preventiva" ADD CONSTRAINT "actividad_preventiva_idPlanTrabajoGRD_fkey" FOREIGN KEY ("idPlanTrabajoGRD") REFERENCES "public"."plan_trabajo_grd"("idPlanTrabajoGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."actividad_preventiva" ADD CONSTRAINT "actividad_preventiva_idUsuarioRegistroGRD_fkey" FOREIGN KEY ("idUsuarioRegistroGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."actividad_preventiva" ADD CONSTRAINT "actividad_preventiva_idUsuarioResponsableGRD_fkey" FOREIGN KEY ("idUsuarioResponsableGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asignacion_brigadista_incidencia" ADD CONSTRAINT "asignacion_brigadista_incidencia_idBrigadistaParroquial_fkey" FOREIGN KEY ("idBrigadistaParroquial") REFERENCES "public"."brigadista_parroquial"("idBrigadistaParroquial") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asignacion_brigadista_incidencia" ADD CONSTRAINT "asignacion_brigadista_incidencia_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asignacion_brigadista_incidencia" ADD CONSTRAINT "asignacion_brigadista_incidencia_idUsuarioAsignadorGRD_fkey" FOREIGN KEY ("idUsuarioAsignadorGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aviso_emergencia" ADD CONSTRAINT "aviso_emergencia_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aviso_emergencia" ADD CONSTRAINT "aviso_emergencia_idUsuarioGRD_fkey" FOREIGN KEY ("idUsuarioGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brigadista_parroquial" ADD CONSTRAINT "brigadista_parroquial_idCertificacionCurso_fkey" FOREIGN KEY ("idCertificacionCurso") REFERENCES "public"."certificacion_curso"("idCertificacionCurso") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brigadista_parroquial" ADD CONSTRAINT "brigadista_parroquial_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalogo_detalle_grd" ADD CONSTRAINT "catalogo_detalle_grd_idCatalogoGRD_fkey" FOREIGN KEY ("idCatalogoGRD") REFERENCES "public"."catalogo_grd"("idCatalogoGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalogo_lugar" ADD CONSTRAINT "catalogo_lugar_idLugarPadre_fkey" FOREIGN KEY ("idLugarPadre") REFERENCES "public"."catalogo_lugar"("idLugar") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalogo_lugar" ADD CONSTRAINT "catalogo_lugar_idTipoLugar_fkey" FOREIGN KEY ("idTipoLugar") REFERENCES "public"."tipo_lugar"("idTipoLugar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificacion_curso" ADD CONSTRAINT "certificacion_curso_idInscripcionCurso_fkey" FOREIGN KEY ("idInscripcionCurso") REFERENCES "public"."inscripcion_curso"("idInscripcionCurso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credencial_modulo" ADD CONSTRAINT "credencial_modulo_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credencial_rol" ADD CONSTRAINT "credencial_rol_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credencial_rol" ADD CONSTRAINT "credencial_rol_idRol_fkey" FOREIGN KEY ("idRol") REFERENCES "public"."rol"("idRol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cuestionario_curso" ADD CONSTRAINT "cuestionario_curso_idCursoCapacitacion_fkey" FOREIGN KEY ("idCursoCapacitacion") REFERENCES "public"."curso_capacitacion"("idCursoCapacitacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curso_capacitacion" ADD CONSTRAINT "curso_capacitacion_idInstitucionAliada_fkey" FOREIGN KEY ("idInstitucionAliada") REFERENCES "public"."institucion_aliada"("idInstitucionAliada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curso_capacitacion" ADD CONSTRAINT "curso_capacitacion_idUsuarioResponsableGRD_fkey" FOREIGN KEY ("idUsuarioResponsableGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entrega_ayuda_humanitaria" ADD CONSTRAINT "entrega_ayuda_humanitaria_idGrupoFamiliar_fkey" FOREIGN KEY ("idGrupoFamiliar") REFERENCES "public"."grupo_familiar_afectado"("idGrupoFamiliar") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entrega_ayuda_humanitaria" ADD CONSTRAINT "entrega_ayuda_humanitaria_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entrega_ayuda_humanitaria" ADD CONSTRAINT "entrega_ayuda_humanitaria_idPersonaAfectada_fkey" FOREIGN KEY ("idPersonaAfectada") REFERENCES "public"."persona_afectada"("idPersonaAfectada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entrega_ayuda_humanitaria" ADD CONSTRAINT "entrega_ayuda_humanitaria_idSolicitud_fkey" FOREIGN KEY ("idSolicitud") REFERENCES "public"."solicitud_ayuda_humanitaria"("idSolicitud") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluacion_curso" ADD CONSTRAINT "evaluacion_curso_idCuestionarioCurso_fkey" FOREIGN KEY ("idCuestionarioCurso") REFERENCES "public"."cuestionario_curso"("idCuestionarioCurso") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluacion_curso" ADD CONSTRAINT "evaluacion_curso_idInscripcionCurso_fkey" FOREIGN KEY ("idInscripcionCurso") REFERENCES "public"."inscripcion_curso"("idInscripcionCurso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidencia_grd" ADD CONSTRAINT "evidencia_grd_idTipoEvidencia_fkey" FOREIGN KEY ("idTipoEvidencia") REFERENCES "public"."catalogo_detalle_grd"("idCatalogoDetalleGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidencia_grd" ADD CONSTRAINT "evidencia_grd_idTipoReferencia_fkey" FOREIGN KEY ("idTipoReferencia") REFERENCES "public"."tipo_referencia"("idTipoReferencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidencia_grd" ADD CONSTRAINT "evidencia_grd_idUsuarioCargaGRD_fkey" FOREIGN KEY ("idUsuarioCargaGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grupo_familiar_afectado" ADD CONSTRAINT "grupo_familiar_afectado_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historial_auditoria_grd" ADD CONSTRAINT "historial_auditoria_grd_idTipoAccion_fkey" FOREIGN KEY ("idTipoAccion") REFERENCES "public"."catalogo_detalle_grd"("idCatalogoDetalleGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historial_auditoria_grd" ADD CONSTRAINT "historial_auditoria_grd_idTipoReferencia_fkey" FOREIGN KEY ("idTipoReferencia") REFERENCES "public"."tipo_referencia"("idTipoReferencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historial_auditoria_grd" ADD CONSTRAINT "historial_auditoria_grd_idUsuarioGRD_fkey" FOREIGN KEY ("idUsuarioGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historial_estado_incidencia" ADD CONSTRAINT "historial_estado_incidencia_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."incidencia" ADD CONSTRAINT "incidencia_idAviso_fkey" FOREIGN KEY ("idAviso") REFERENCES "public"."aviso_emergencia"("idAviso") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."incidencia" ADD CONSTRAINT "incidencia_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."incidencia" ADD CONSTRAINT "incidencia_idUsuarioResponsableGRD_fkey" FOREIGN KEY ("idUsuarioResponsableGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."informe" ADD CONSTRAINT "informe_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inscripcion_curso" ADD CONSTRAINT "inscripcion_curso_idCursoCapacitacion_fkey" FOREIGN KEY ("idCursoCapacitacion") REFERENCES "public"."curso_capacitacion"("idCursoCapacitacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inscripcion_curso" ADD CONSTRAINT "inscripcion_curso_idParticipante_fkey" FOREIGN KEY ("idParticipante") REFERENCES "public"."participante"("idParticipante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intento_login" ADD CONSTRAINT "intento_login_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kit_articulo" ADD CONSTRAINT "kit_articulo_idKitEmergencia_fkey" FOREIGN KEY ("idKitEmergencia") REFERENCES "public"."kit_emergencia"("idKitEmergencia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kit_emergencia" ADD CONSTRAINT "kit_emergencia_idParroquiaBeneficiaria_fkey" FOREIGN KEY ("idParroquiaBeneficiaria") REFERENCES "public"."parroquia"("idParroquia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_capacitacion" ADD CONSTRAINT "material_capacitacion_idCursoCapacitacion_fkey" FOREIGN KEY ("idCursoCapacitacion") REFERENCES "public"."curso_capacitacion"("idCursoCapacitacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_capacitacion" ADD CONSTRAINT "material_capacitacion_idUnidadContenido_fkey" FOREIGN KEY ("idUnidadContenido") REFERENCES "public"."unidad_contenido"("idUnidadContenido") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_kit" ADD CONSTRAINT "movimiento_kit_idActividadPreventiva_fkey" FOREIGN KEY ("idActividadPreventiva") REFERENCES "public"."actividad_preventiva"("idActividadPreventiva") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_kit" ADD CONSTRAINT "movimiento_kit_idKitEmergencia_fkey" FOREIGN KEY ("idKitEmergencia") REFERENCES "public"."kit_emergencia"("idKitEmergencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_kit" ADD CONSTRAINT "movimiento_kit_idParroquiaDestino_fkey" FOREIGN KEY ("idParroquiaDestino") REFERENCES "public"."parroquia"("idParroquia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_kit" ADD CONSTRAINT "movimiento_kit_idUsuarioResponsableGRD_fkey" FOREIGN KEY ("idUsuarioResponsableGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificaciones" ADD CONSTRAINT "notificaciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."observacion_grd" ADD CONSTRAINT "observacion_grd_idTipoReferencia_fkey" FOREIGN KEY ("idTipoReferencia") REFERENCES "public"."tipo_referencia"("idTipoReferencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observacion_grd" ADD CONSTRAINT "observacion_grd_idUsuarioGRD_fkey" FOREIGN KEY ("idUsuarioGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observacion_simulacro" ADD CONSTRAINT "observacion_simulacro_idActividadPreventiva_fkey" FOREIGN KEY ("idActividadPreventiva") REFERENCES "public"."actividad_preventiva"("idActividadPreventiva") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observacion_simulacro" ADD CONSTRAINT "observacion_simulacro_idUsuarioGRD_fkey" FOREIGN KEY ("idUsuarioGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opcion_pregunta" ADD CONSTRAINT "opcion_pregunta_idPreguntaCuestionario_fkey" FOREIGN KEY ("idPreguntaCuestionario") REFERENCES "public"."pregunta_cuestionario"("idPreguntaCuestionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."parroquia" ADD CONSTRAINT "parroquia_idLugarCatalogo_fkey" FOREIGN KEY ("idLugarCatalogo") REFERENCES "public"."catalogo_lugar"("idLugar") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participante" ADD CONSTRAINT "participante_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permiso" ADD CONSTRAINT "permiso_idRecursoAPI_fkey" FOREIGN KEY ("idRecursoAPI") REFERENCES "public"."recurso_api"("idRecursoAPI") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."persona_afectada" ADD CONSTRAINT "persona_afectada_idGrupoFamiliar_fkey" FOREIGN KEY ("idGrupoFamiliar") REFERENCES "public"."grupo_familiar_afectado"("idGrupoFamiliar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_trabajo_grd" ADD CONSTRAINT "plan_trabajo_grd_idParroquia_fkey" FOREIGN KEY ("idParroquia") REFERENCES "public"."parroquia"("idParroquia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_trabajo_grd" ADD CONSTRAINT "plan_trabajo_grd_idUsuarioResponsableGRD_fkey" FOREIGN KEY ("idUsuarioResponsableGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pregunta_cuestionario" ADD CONSTRAINT "pregunta_cuestionario_idCuestionarioCurso_fkey" FOREIGN KEY ("idCuestionarioCurso") REFERENCES "public"."cuestionario_curso"("idCuestionarioCurso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."progreso_capacitacion" ADD CONSTRAINT "progreso_capacitacion_idInscripcionCurso_fkey" FOREIGN KEY ("idInscripcionCurso") REFERENCES "public"."inscripcion_curso"("idInscripcionCurso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."progreso_capacitacion" ADD CONSTRAINT "progreso_capacitacion_idUnidadContenido_fkey" FOREIGN KEY ("idUnidadContenido") REFERENCES "public"."unidad_contenido"("idUnidadContenido") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recuperacion_contrasena" ADD CONSTRAINT "recuperacion_contrasena_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."respuesta_evaluacion" ADD CONSTRAINT "respuesta_evaluacion_idEvaluacionCurso_fkey" FOREIGN KEY ("idEvaluacionCurso") REFERENCES "public"."evaluacion_curso"("idEvaluacionCurso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."respuesta_evaluacion" ADD CONSTRAINT "respuesta_evaluacion_idOpcionPregunta_fkey" FOREIGN KEY ("idOpcionPregunta") REFERENCES "public"."opcion_pregunta"("idOpcionPregunta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."respuesta_evaluacion" ADD CONSTRAINT "respuesta_evaluacion_idPreguntaCuestionario_fkey" FOREIGN KEY ("idPreguntaCuestionario") REFERENCES "public"."pregunta_cuestionario"("idPreguntaCuestionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rol_permiso" ADD CONSTRAINT "rol_permiso_idPermiso_fkey" FOREIGN KEY ("idPermiso") REFERENCES "public"."permiso"("idPermiso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rol_permiso" ADD CONSTRAINT "rol_permiso_idRol_fkey" FOREIGN KEY ("idRol") REFERENCES "public"."rol"("idRol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seguimiento_incidencia" ADD CONSTRAINT "seguimiento_incidencia_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sesion" ADD CONSTRAINT "sesion_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."simulacro_brigadista" ADD CONSTRAINT "simulacro_brigadista_idActividadPreventiva_fkey" FOREIGN KEY ("idActividadPreventiva") REFERENCES "public"."actividad_preventiva"("idActividadPreventiva") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."simulacro_brigadista" ADD CONSTRAINT "simulacro_brigadista_idBrigadistaParroquial_fkey" FOREIGN KEY ("idBrigadistaParroquial") REFERENCES "public"."brigadista_parroquial"("idBrigadistaParroquial") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."simulacro_brigadista" ADD CONSTRAINT "simulacro_brigadista_idUsuarioAsignadorGRD_fkey" FOREIGN KEY ("idUsuarioAsignadorGRD") REFERENCES "public"."usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitud_ayuda_humanitaria" ADD CONSTRAINT "solicitud_ayuda_humanitaria_idGrupoFamiliar_fkey" FOREIGN KEY ("idGrupoFamiliar") REFERENCES "public"."grupo_familiar_afectado"("idGrupoFamiliar") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitud_ayuda_humanitaria" ADD CONSTRAINT "solicitud_ayuda_humanitaria_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "public"."incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitud_ayuda_humanitaria" ADD CONSTRAINT "solicitud_ayuda_humanitaria_idPersonaAfectada_fkey" FOREIGN KEY ("idPersonaAfectada") REFERENCES "public"."persona_afectada"("idPersonaAfectada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."unidad_contenido" ADD CONSTRAINT "unidad_contenido_idCursoCapacitacion_fkey" FOREIGN KEY ("idCursoCapacitacion") REFERENCES "public"."curso_capacitacion"("idCursoCapacitacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuario_grd" ADD CONSTRAINT "usuario_grd_idCredencial_fkey" FOREIGN KEY ("idCredencial") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

