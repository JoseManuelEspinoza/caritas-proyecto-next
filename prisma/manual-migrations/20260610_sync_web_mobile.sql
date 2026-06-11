BEGIN;

-- =========================================================
-- 1. ACCION RESPUESTA
-- =========================================================
ALTER TABLE "accion_respuesta"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "syncEstado" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uuidMovil" TEXT;

UPDATE "accion_respuesta"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "accion_respuesta"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "accion_respuesta_uuidMovil_key"
ON "accion_respuesta"("uuidMovil");


-- =========================================================
-- 2. ASIGNACION BRIGADISTA INCIDENCIA
-- =========================================================
ALTER TABLE "asignacion_brigadista_incidencia"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "syncEstado" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uuidMovil" TEXT;

UPDATE "asignacion_brigadista_incidencia"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "asignacion_brigadista_incidencia"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "asignacion_brigadista_incidencia_uuidMovil_key"
ON "asignacion_brigadista_incidencia"("uuidMovil");


-- =========================================================
-- 3. AVISO EMERGENCIA
-- =========================================================
ALTER TABLE "aviso_emergencia"
  ADD COLUMN IF NOT EXISTS "dniInformante" TEXT,
  ADD COLUMN IF NOT EXISTS "origenRegistro" TEXT DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS "rolInformante" TEXT;

CREATE INDEX IF NOT EXISTS "idx_aviso_dni_informante"
ON "aviso_emergencia"("dniInformante");

CREATE INDEX IF NOT EXISTS "idx_aviso_origen"
ON "aviso_emergencia"("origenRegistro");


-- =========================================================
-- 4. ENTREGA AYUDA HUMANITARIA
-- =========================================================
ALTER TABLE "entrega_ayuda_humanitaria"
  ADD COLUMN IF NOT EXISTS "idGrupoFamiliar" TEXT,
  ADD COLUMN IF NOT EXISTS "idPersonaAfectada" TEXT,
  ADD COLUMN IF NOT EXISTS "uuidAfectadoMovil" TEXT;

CREATE INDEX IF NOT EXISTS "idx_entrega_persona_afectada"
ON "entrega_ayuda_humanitaria"("idPersonaAfectada");

CREATE INDEX IF NOT EXISTS "idx_entrega_grupo_familiar"
ON "entrega_ayuda_humanitaria"("idGrupoFamiliar");

CREATE INDEX IF NOT EXISTS "idx_entrega_uuid_afectado_movil"
ON "entrega_ayuda_humanitaria"("uuidAfectadoMovil");


-- =========================================================
-- 5. GRUPO FAMILIAR AFECTADO
-- =========================================================
ALTER TABLE "grupo_familiar_afectado"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "syncEstado" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uuidMovil" TEXT;

UPDATE "grupo_familiar_afectado"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "grupo_familiar_afectado"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "grupo_familiar_afectado_uuidMovil_key"
ON "grupo_familiar_afectado"("uuidMovil");

CREATE UNIQUE INDEX IF NOT EXISTS "grupo_familiar_incidencia_codigo_key"
ON "grupo_familiar_afectado"("idIncidencia", "codigoGrupo");


-- =========================================================
-- 6. HISTORIAL ESTADO INCIDENCIA
-- =========================================================
ALTER TABLE "historial_estado_incidencia"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "syncEstado" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uuidMovil" TEXT;

UPDATE "historial_estado_incidencia"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "historial_estado_incidencia"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "historial_estado_incidencia_uuidMovil_key"
ON "historial_estado_incidencia"("uuidMovil");


-- =========================================================
-- 7. INCIDENCIA
-- =========================================================
ALTER TABLE "incidencia"
  ADD COLUMN IF NOT EXISTS "causaEvento" TEXT,
  ADD COLUMN IF NOT EXISTS "distritoEvento" TEXT,
  ADD COLUMN IF NOT EXISTS "fechaSuceso" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "horaSuceso" TEXT,
  ADD COLUMN IF NOT EXISTS "necesidades" TEXT,
  ADD COLUMN IF NOT EXISTS "necesidadesObs" TEXT,
  ADD COLUMN IF NOT EXISTS "numAfectadosReportado" INTEGER,
  ADD COLUMN IF NOT EXISTS "origenRegistro" TEXT DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS "parroquiaNombreSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "referenciaEvento" TEXT,
  ADD COLUMN IF NOT EXISTS "reportadoPorCelular" TEXT,
  ADD COLUMN IF NOT EXISTS "reportadoPorDni" TEXT,
  ADD COLUMN IF NOT EXISTS "reportadoPorNombre" TEXT,
  ADD COLUMN IF NOT EXISTS "reportadoPorRol" TEXT;

CREATE INDEX IF NOT EXISTS "idx_incidencia_fecha_suceso"
ON "incidencia"("fechaSuceso");

CREATE INDEX IF NOT EXISTS "idx_incidencia_distrito"
ON "incidencia"("distritoEvento");

CREATE INDEX IF NOT EXISTS "idx_incidencia_reportante_dni"
ON "incidencia"("reportadoPorDni");

CREATE INDEX IF NOT EXISTS "idx_incidencia_origen"
ON "incidencia"("origenRegistro");


-- =========================================================
-- 8. SOLICITUD AYUDA HUMANITARIA
-- =========================================================
ALTER TABLE "solicitud_ayuda_humanitaria"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "idGrupoFamiliar" TEXT,
  ADD COLUMN IF NOT EXISTS "idPersonaAfectada" TEXT,
  ADD COLUMN IF NOT EXISTS "syncEstado" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uuidAfectadoMovil" TEXT,
  ADD COLUMN IF NOT EXISTS "uuidMovil" TEXT;

UPDATE "solicitud_ayuda_humanitaria"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "solicitud_ayuda_humanitaria"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "solicitud_ayuda_humanitaria_uuidMovil_key"
ON "solicitud_ayuda_humanitaria"("uuidMovil");

CREATE INDEX IF NOT EXISTS "idx_solicitud_grupo_familiar"
ON "solicitud_ayuda_humanitaria"("idGrupoFamiliar");

CREATE INDEX IF NOT EXISTS "idx_solicitud_persona_afectada"
ON "solicitud_ayuda_humanitaria"("idPersonaAfectada");

CREATE INDEX IF NOT EXISTS "idx_solicitud_uuid_afectado_movil"
ON "solicitud_ayuda_humanitaria"("uuidAfectadoMovil");


-- =========================================================
-- 9. FOREIGN KEYS
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'solicitud_ayuda_humanitaria_idGrupoFamiliar_fkey'
  ) THEN
    ALTER TABLE "solicitud_ayuda_humanitaria"
    ADD CONSTRAINT "solicitud_ayuda_humanitaria_idGrupoFamiliar_fkey"
    FOREIGN KEY ("idGrupoFamiliar")
    REFERENCES "grupo_familiar_afectado"("idGrupoFamiliar")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'solicitud_ayuda_humanitaria_idPersonaAfectada_fkey'
  ) THEN
    ALTER TABLE "solicitud_ayuda_humanitaria"
    ADD CONSTRAINT "solicitud_ayuda_humanitaria_idPersonaAfectada_fkey"
    FOREIGN KEY ("idPersonaAfectada")
    REFERENCES "persona_afectada"("idPersonaAfectada")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entrega_ayuda_humanitaria_idGrupoFamiliar_fkey'
  ) THEN
    ALTER TABLE "entrega_ayuda_humanitaria"
    ADD CONSTRAINT "entrega_ayuda_humanitaria_idGrupoFamiliar_fkey"
    FOREIGN KEY ("idGrupoFamiliar")
    REFERENCES "grupo_familiar_afectado"("idGrupoFamiliar")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entrega_ayuda_humanitaria_idPersonaAfectada_fkey'
  ) THEN
    ALTER TABLE "entrega_ayuda_humanitaria"
    ADD CONSTRAINT "entrega_ayuda_humanitaria_idPersonaAfectada_fkey"
    FOREIGN KEY ("idPersonaAfectada")
    REFERENCES "persona_afectada"("idPersonaAfectada")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;