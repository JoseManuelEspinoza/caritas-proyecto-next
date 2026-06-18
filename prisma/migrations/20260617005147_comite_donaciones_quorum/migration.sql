-- CreateEnum
CREATE TYPE "EstadoRondaVotacionComite" AS ENUM ('ABIERTA', 'CERRADA_APROBADA', 'CERRADA_RECHAZADA', 'CERRADA_OBSERVADA');

-- CreateEnum
CREATE TYPE "DecisionVotoComite" AS ENUM ('A_FAVOR', 'EN_CONTRA');

-- DropForeignKey
ALTER TABLE "notificaciones" DROP CONSTRAINT "notificaciones_userId_fkey";

-- AlterTable
ALTER TABLE "notificaciones" ALTER COLUMN "tipo" SET DATA TYPE TEXT,
ALTER COLUMN "titulo" SET DATA TYPE TEXT,
ALTER COLUMN "enlace" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ronda_votacion_comite" (
    "idRonda" TEXT NOT NULL,
    "idIncidencia" TEXT NOT NULL,
    "numeroRonda" INTEGER NOT NULL,
    "estado" "EstadoRondaVotacionComite" NOT NULL DEFAULT 'ABIERTA',
    "nSnapshot" INTEGER,
    "umbralSnapshot" INTEGER,
    "abiertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaAt" TIMESTAMP(3),
    "idUsuarioCierre" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ronda_votacion_comite_pkey" PRIMARY KEY ("idRonda")
);

-- CreateTable
CREATE TABLE "voto_comite_donaciones" (
    "idVoto" TEXT NOT NULL,
    "idRonda" TEXT NOT NULL,
    "idUsuarioGRD" TEXT NOT NULL,
    "decision" "DecisionVotoComite" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voto_comite_donaciones_pkey" PRIMARY KEY ("idVoto")
);

-- CreateIndex
CREATE INDEX "idx_ronda_incidencia_estado" ON "ronda_votacion_comite"("idIncidencia", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ronda_incidencia_numero" ON "ronda_votacion_comite"("idIncidencia", "numeroRonda");

-- CreateIndex
CREATE INDEX "idx_voto_ronda_decision" ON "voto_comite_donaciones"("idRonda", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "uq_voto_ronda_usuario" ON "voto_comite_donaciones"("idRonda", "idUsuarioGRD");

-- AddForeignKey
ALTER TABLE "ronda_votacion_comite" ADD CONSTRAINT "ronda_votacion_comite_idIncidencia_fkey" FOREIGN KEY ("idIncidencia") REFERENCES "incidencia"("idIncidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ronda_votacion_comite" ADD CONSTRAINT "ronda_votacion_comite_idUsuarioCierre_fkey" FOREIGN KEY ("idUsuarioCierre") REFERENCES "usuario_grd"("idUsuarioGRD") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_comite_donaciones" ADD CONSTRAINT "voto_comite_donaciones_idRonda_fkey" FOREIGN KEY ("idRonda") REFERENCES "ronda_votacion_comite"("idRonda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_comite_donaciones" ADD CONSTRAINT "voto_comite_donaciones_idUsuarioGRD_fkey" FOREIGN KEY ("idUsuarioGRD") REFERENCES "usuario_grd"("idUsuarioGRD") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_notif_user_leida_fecha" RENAME TO "notificaciones_userId_leida_createdAt_idx";
