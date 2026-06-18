/**
 * Seed de DATOS DEMO para Cáritas GRD — idempotente y aditivo.
 *
 * Puebla el sistema con datos coherentes para demos y para que el algoritmo
 * de sugerencia de brigadistas funcione (requiere parroquias CON coordenadas):
 *   - Parroquias de Lima con lat/lng reales (por distrito).
 *   - Brigadistas distribuidos en esas parroquias, con distinta disponibilidad.
 *   - Simulacros (ActividadPreventiva) en varios estados.
 *
 * Reemplaza al megaseed (que quedó obsoleto tras el refactor del comité).
 * Se puede correr varias veces sin duplicar (busca por nombre/dni antes de crear).
 *
 * Ejecutar:
 *   docker compose exec -e NODE_OPTIONS="--conditions=react-server" web npx tsx prisma/seed-demo.ts
 */
import { prisma } from "../app/lib/prisma";

// Parroquias con coordenadas reales (centro aproximado del distrito en Lima).
const PARROQUIAS: { nombre: string; distrito: string; lat: number; lng: number }[] = [
  { nombre: "Parroquia San Juan Bautista", distrito: "San Juan de Lurigancho", lat: -11.9939, lng: -77.0067 },
  { nombre: "Parroquia Nuestra Señora del Carmen", distrito: "Barranco", lat: -12.1464, lng: -77.0206 },
  { nombre: "Parroquia Santa Rosa de Lima", distrito: "Comas", lat: -11.9389, lng: -77.0628 },
  { nombre: "Parroquia San Pedro", distrito: "Miraflores", lat: -12.1211, lng: -77.0297 },
  { nombre: "Parroquia San José Obrero", distrito: "Villa El Salvador", lat: -12.2136, lng: -76.9319 },
  { nombre: "Parroquia Cristo Salvador", distrito: "San Martín de Porres", lat: -12.0089, lng: -77.0858 },
  { nombre: "Parroquia Sagrado Corazón de Jesús", distrito: "Ate", lat: -12.0264, lng: -76.9178 },
  { nombre: "Parroquia Santa María de Fátima", distrito: "Villa María del Triunfo", lat: -12.1611, lng: -76.9389 },
  { nombre: "Parroquia Nuestra Señora del Pilar", distrito: "El Agustino", lat: -12.0431, lng: -76.9989 },
  { nombre: "Parroquia San Francisco de Asís", distrito: "Carabayllo", lat: -11.8531, lng: -77.0367 },
  { nombre: "Parroquia Inmaculada Concepción", distrito: "Chorrillos", lat: -12.1719, lng: -77.0153 },
  { nombre: "Parroquia Señor de los Milagros", distrito: "Puente Piedra", lat: -11.8628, lng: -77.0747 },
];

// Nombres para generar brigadistas variados.
const NOMBRES = ["Carlos", "María", "José", "Ana", "Luis", "Rosa", "Pedro", "Carmen", "Jorge", "Lucía", "Miguel", "Elena"];
const APELLIDOS = ["Quispe", "Mamani", "Flores", "Huamán", "Rojas", "Vargas", "Torres", "Díaz", "Ramos", "Castro", "Mendoza", "Pacheco"];
const DISPONIBILIDAD = ["DISPONIBLE", "DISPONIBLE", "NO_DISPONIBLE"]; // ~2/3 disponibles

const TIPOS_SIMULACRO = ["Simulacro de Sismo", "Simulacro de Incendio", "Simulacro de Inundación", "Charla de Prevención"];
const ESTADOS_SIM = ["PROGRAMADA", "EN_EJECUCION", "EJECUTADA"];

async function main() {
  console.log("🌱 Seed demo Cáritas GRD\n");

  // ── 1. Parroquias con coordenadas ──
  console.log("📍 Parroquias...");
  const parroquiaIds: string[] = [];
  for (const p of PARROQUIAS) {
    let parr = await prisma.parroquia.findFirst({ where: { nombre: p.nombre }, select: { idParroquia: true } });
    if (!parr) {
      parr = await prisma.parroquia.create({
        data: {
          nombre: p.nombre,
          direccion: `Av. Principal s/n, ${p.distrito}`,
          referencia: `Parroquia en ${p.distrito}`,
          latitud: p.lat,
          longitud: p.lng,
          estado: "ACTIVO",
        },
        select: { idParroquia: true },
      });
      console.log(`  + ${p.nombre} (${p.distrito})`);
    } else {
      // Asegura coordenadas en parroquias ya existentes sin lat/lng.
      await prisma.parroquia.update({
        where: { idParroquia: parr.idParroquia },
        data: { latitud: p.lat, longitud: p.lng },
      });
      console.log(`  = ${p.nombre} (coords actualizadas)`);
    }
    parroquiaIds.push(parr.idParroquia);
  }

  // ── 2. Brigadistas distribuidos ──
  console.log("\n👷 Brigadistas...");
  let creados = 0;
  let dniSeq = 70000000;
  for (let i = 0; i < parroquiaIds.length; i++) {
    const nPorParr = 2 + (i % 2); // 2 o 3 por parroquia
    for (let j = 0; j < nPorParr; j++) {
      const dni = String(dniSeq++);
      const existe = await prisma.brigadistaParroquial.findUnique({ where: { dni }, select: { idBrigadistaParroquial: true } });
      if (existe) continue;
      const nombres = NOMBRES[(i + j) % NOMBRES.length];
      const apellidos = `${APELLIDOS[(i + j) % APELLIDOS.length]} ${APELLIDOS[(i + j + 3) % APELLIDOS.length]}`;
      await prisma.brigadistaParroquial.create({
        data: {
          idParroquia: parroquiaIds[i],
          dni,
          nombres,
          apellidos,
          celular: `9${String(80000000 + dniSeq).slice(0, 8)}`,
          correo: `${nombres.toLowerCase()}.${dni}@brigada.caritas.test`,
          disponibilidad: DISPONIBILIDAD[(i + j) % DISPONIBILIDAD.length],
          estado: "ACTIVO",
        },
      });
      creados++;
    }
  }
  console.log(`  brigadistas nuevos: ${creados}`);

  // ── 3. Simulacros (ActividadPreventiva) ──
  console.log("\n🚨 Simulacros...");
  const registrador = await prisma.usuarioGRD.findFirst({ select: { idUsuarioGRD: true } });
  if (!registrador) {
    console.log("  (omitido: no hay UsuarioGRD para registrar)");
  } else {
    let simCreados = 0;
    for (let i = 0; i < 6; i++) {
      const tipo = TIPOS_SIMULACRO[i % TIPOS_SIMULACRO.length];
      const parr = PARROQUIAS[i % PARROQUIAS.length];
      const nombreActividad = `${tipo} — ${parr.distrito}`;
      const existe = await prisma.actividadPreventiva.findFirst({ where: { nombreActividad }, select: { idActividadPreventiva: true } });
      if (existe) continue;
      const estado = ESTADOS_SIM[i % ESTADOS_SIM.length];
      // Programados a futuro 2026; ejecutados con fecha pasada de 2026.
      const fecha = new Date(2026, 5 + (i % 4), 5 + i, 9, 0, 0);
      await prisma.actividadPreventiva.create({
        data: {
          idParroquia: parroquiaIds[i % parroquiaIds.length],
          idUsuarioRegistroGRD: registrador.idUsuarioGRD,
          idTipoActividadPreventiva: tipo,
          nombreActividad,
          fechaProgramada: fecha,
          ...(estado === "EJECUTADA" ? { fechaEjecucion: fecha, numeroParticipantesReal: 30 + i * 5 } : {}),
          horarioInicio: "09:00",
          lugarActividad: `Local parroquial, ${parr.distrito}`,
          publicoObjetivo: "Comunidad parroquial",
          numeroParticipantesEstimado: 40 + i * 5,
          descripcionActividad: `${tipo} de preparación ante desastres en ${parr.distrito}.`,
          estadoActividad: estado,
        },
      });
      simCreados++;
    }
    console.log(`  simulacros nuevos: ${simCreados}`);
  }

  console.log("\n✅ Seed demo completado.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
