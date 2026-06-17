/**
 * Reparación puntual: crea el perfil UsuarioGRD que les falta a los usuarios
 * con rol COMITEDONACIONES / JEFAOGP ya existentes en la BD.
 *
 * Contexto: el comité vota las donaciones y el voto referencia UsuarioGRD; sin
 * perfil, getUsuarioGRDId()=null y no pueden votar (las donaciones se quedan
 * sin poder aprobarse). El seed (seed-minimal.ts) ya quedó corregido para que
 * los entornos nuevos nazcan bien; este script arregla la BD ya poblada.
 *
 * Idempotente y aditivo (solo crea lo que falta).
 * Ejecutar:
 *   docker compose exec -e NODE_OPTIONS="--conditions=react-server" web npx tsx prisma/fix-perfiles-comite.ts
 */
import { prisma } from "../app/lib/prisma";
import { Role } from "@prisma/client";
function separar(name: string) {
  const p = (name ?? "").trim().split(/\s+/);
  if (p.length <= 1) return { nombres: name || "Usuario", apellidos: "" };
  return { nombres: p.slice(0, 2).join(" "), apellidos: p.slice(2).join(" ") };
}

async function main() {
  const ROLES: Role[] = [Role.COMITEDONACIONES, Role.JEFAOGP];
  const users = await prisma.user.findMany({
    where: { role: { in: ROLES }, estado: "ACTIVO" },
    select: { id: true, email: true, name: true, role: true },
  });

  let creados = 0;
  for (const u of users) {
    const existe = await prisma.usuarioGRD.findUnique({
      where: { idCredencial: u.id },
      select: { idUsuarioGRD: true },
    });
    if (existe) {
      console.log(`  = ${u.email} ya tiene perfil GRD`);
      continue;
    }
    const { nombres, apellidos } = separar(u.name ?? u.email);
    await prisma.usuarioGRD.create({
      data: { idCredencial: u.id, nombres, apellidos, correoReferencia: u.email, estado: "ACTIVO" },
    });
    creados++;
    console.log(`  + perfil GRD creado para ${u.email} [${u.role}]`);
  }

  console.log(`\nTotal perfiles creados: ${creados}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
