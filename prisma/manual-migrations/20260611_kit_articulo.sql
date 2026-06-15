-- Composición de kits de emergencia: qué artículos contiene cada kit y en qué
-- cantidad. Aditivo — no modifica tablas existentes.
-- Aplicar con: npx prisma db execute --file prisma/manual-migrations/20260611_kit_articulo.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "kit_articulo" (
  "idKitArticulo"   TEXT NOT NULL,
  "idKitEmergencia" TEXT NOT NULL,
  "codigo"          TEXT,
  "descripcion"     TEXT NOT NULL,
  "cantidad"        INTEGER NOT NULL DEFAULT 1,
  "orden"           INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "kit_articulo_pkey" PRIMARY KEY ("idKitArticulo"),
  CONSTRAINT "kit_articulo_idKitEmergencia_fkey"
    FOREIGN KEY ("idKitEmergencia") REFERENCES "kit_emergencia"("idKitEmergencia")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_kit_articulo_kit" ON "kit_articulo"("idKitEmergencia");
