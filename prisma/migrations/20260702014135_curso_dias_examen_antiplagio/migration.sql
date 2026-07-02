-- AlterTable: rango de realización del curso -> días desde la matrícula
ALTER TABLE "curso_capacitacion" DROP COLUMN "realizacion_desde";
ALTER TABLE "curso_capacitacion" DROP COLUMN "realizacion_hasta";
ALTER TABLE "curso_capacitacion" ADD COLUMN "duracionRealizacionDias" INTEGER;

-- AlterTable: tiempo límite por cuestionario (anti-plagio)
ALTER TABLE "cuestionario_curso" ADD COLUMN "tiempoLimiteMinutos" INTEGER;

-- AlterTable: control de intento en curso y pérdidas de foco (anti-plagio)
ALTER TABLE "evaluacion_curso" ADD COLUMN "fechaInicio" TIMESTAMP(3);
ALTER TABLE "evaluacion_curso" ADD COLUMN "cambiosFoco" INTEGER NOT NULL DEFAULT 0;
