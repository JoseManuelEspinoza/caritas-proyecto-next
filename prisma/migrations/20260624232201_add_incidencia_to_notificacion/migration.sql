-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN "idIncidencia" TEXT;

-- CreateIndex
CREATE INDEX "notificaciones_idIncidencia_tipo_createdAt_idx" ON "notificaciones"("idIncidencia", "tipo", "createdAt");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "incidencia"("idIncidencia") ON DELETE SET NULL ON UPDATE CASCADE;
