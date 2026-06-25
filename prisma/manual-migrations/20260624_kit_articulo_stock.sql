-- Stock por elemento del kit. Cada artículo (kit_articulo) maneja su propio
-- stock disponible; el kit es solo una agrupación de elementos. Al aprobar una
-- entrega en el Comité de Donaciones se descuenta de aquí y se valida que haya
-- suficiente. Aditivo — no modifica datos existentes (default 0).
-- Aplicar con: npx prisma db execute --file prisma/manual-migrations/20260624_kit_articulo_stock.sql --schema prisma/schema.prisma

ALTER TABLE "kit_articulo"
  ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;
