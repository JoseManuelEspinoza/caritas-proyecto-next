/**
 * Seed completo — crea la cadena:
 * Parroquia → User → UsuarioGRD → BrigadistaParroquial
 *
 * Ejecutar: docker-compose exec web npm run seed
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ override: false }); // no sobreescribe vars ya seteadas por Docker
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Caritas2026!"; // 8+ chars, letra, número, símbolo especial

// ─── Parroquias base ──────────────────────────────────────────────────────────

const PARROQUIAS = [
  { nombre: "Parroquia San Juan Bautista", direccion: "Av. El Sol 123, San Juan de Lurigancho" },
  {
    nombre: "Parroquia Nuestra Señora del Carmen",
    direccion: "Jr. Las Flores 456, Villa El Salvador",
  },
  { nombre: "Parroquia Santa Rosa", direccion: "Av. Principal 789, San Martín de Porres" },
];

// ─── Usuarios ─────────────────────────────────────────────────────────────────

const USERS = [
  {
    email: "admin@caritas.pe",
    name: "Administrador del Sistema",
    role: "ADMINISTRADOR",
    tipoGRD: "admin",
  },
  {
    email: "especialista@caritas.pe",
    name: "Carlos Méndez Paredes",
    role: "ESPECIALISTAGRD",
    tipoGRD: "especialista",
  },
  {
    email: "brigadista@caritas.pe",
    name: "Ana Torres Quispe",
    role: "BRIGADISTA",
    tipoGRD: "brigadista",
  },
  {
    email: "comite@caritas.pe",
    name: "Comité de Donaciones",
    role: "COMITEDONACIONES",
    tipoGRD: null,
  },
  { email: "jefaogp@caritas.pe", name: "Jefa de OGP", role: "JEFAOGP", tipoGRD: null },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  // 1. Parroquias
  console.log("\n📍 Parroquias...");
  const parroquias: { idParroquia: string; nombre: string }[] = [];
  for (const p of PARROQUIAS) {
    let rec = await prisma.parroquia.findFirst({ where: { nombre: p.nombre } });
    if (!rec) {
      rec = await prisma.parroquia.create({ data: { nombre: p.nombre, direccion: p.direccion } });
    }
    parroquias.push(rec);
    console.log(`   ✓  ${rec.nombre}`);
  }

  // 2. Usuarios + UsuarioGRD + BrigadistaParroquial
  console.log("\n👤 Usuarios...");
  for (const u of USERS) {
    // User
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, password: hash, role: u.role as any },
    });
    console.log(`   ✓  [${u.role.padEnd(16)}]  ${user.email}`);

    if (!u.tipoGRD) continue; // comite y jefaOGP no tienen UsuarioGRD en esta primera versión

    // UsuarioGRD
    let usuarioGRD = await prisma.usuarioGRD.findUnique({ where: { idCredencial: user.id } });
    if (!usuarioGRD) {
      const partes = u.name.split(" ");
      usuarioGRD = await prisma.usuarioGRD.create({
        data: {
          idCredencial: user.id,
          nombres: partes.slice(0, 2).join(" "),
          apellidos: partes.slice(2).join(" ") || "",
          correoReferencia: u.email,
        },
      });
    }
    console.log(`      → UsuarioGRD: ${usuarioGRD.idUsuarioGRD}`);

    // BrigadistaParroquial solo para el brigadista
    if (u.tipoGRD === "brigadista") {
      const parroquiaAsignada = parroquias[0]; // Parroquia San Juan Bautista

      const existing = await prisma.brigadistaParroquial.findFirst({
        where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
      });
      if (!existing) {
        const brigadista = await prisma.brigadistaParroquial.create({
          data: {
            idParroquia: parroquiaAsignada.idParroquia,
            idUsuarioGRD: usuarioGRD.idUsuarioGRD,
            nombres: "Ana",
            apellidos: "Torres Quispe",
            correo: u.email,
            disponibilidad: "DISPONIBLE",
            estado: "ACTIVO",
          },
        });
        console.log(`      → Brigadista: ${brigadista.idBrigadistaParroquial} (disponible)`);
      } else {
        console.log(`      → Brigadista ya existe: ${existing.idBrigadistaParroquial}`);
      }
    }
  }

  // 3. Catálogos + detalles
  console.log("\n🗂️  Catálogos...");
  const CATALOGOS = [
    {
      nombre: "Tipos de Evento",
      items: ["Incendio", "Inundación", "Sismo", "Derrumbe", "Deslizamiento", "Vendaval"],
    },
    { nombre: "Niveles de Afectación", items: ["Leve", "Moderado", "Severo"] },
    {
      nombre: "Necesidades",
      items: [
        "Alimentación",
        "Agua potable",
        "Refugio temporal",
        "Abrigo / Ropa",
        "Salud / Medicamentos",
        "Materiales de construcción",
      ],
    },
    {
      nombre: "Fuentes de Alerta",
      items: ["Brigadista parroquial", "Defensa Civil", "Bomberos", "Comunidad / Vecinos"],
    },
    {
      nombre: "Grupos Vulnerables",
      items: [
        "Niños (0–12 años)",
        "Adultos mayores (60+)",
        "Gestantes / Madres lactantes",
        "Personas con discapacidad",
      ],
    },
  ];
  const slug = (v: string) =>
    v
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30);
  for (const c of CATALOGOS) {
    let cat = await prisma.catalogoGRD.findUnique({ where: { nombreCatalogo: c.nombre } });
    if (!cat) cat = await prisma.catalogoGRD.create({ data: { nombreCatalogo: c.nombre } });
    for (const v of c.items) {
      const codigo = slug(v);
      const exists = await prisma.catalogoDetalleGRD.findUnique({
        where: { idCatalogoGRD_codigo: { idCatalogoGRD: cat.idCatalogoGRD, codigo } },
      });
      if (!exists)
        await prisma.catalogoDetalleGRD.create({
          data: { idCatalogoGRD: cat.idCatalogoGRD, codigo, valor: v },
        });
    }
    console.log(`   ✓  ${c.nombre} (${c.items.length} ítems)`);
  }

  // 4. Kits de emergencia
  console.log("\n📦 Kits...");
  const KITS = [
    {
      tipoKit: "Kit de Víveres",
      descripcion: "Arroz 5kg, aceite 1L, atún, leche evaporada, fideos, azúcar",
      stockActual: 40,
    },
    {
      tipoKit: "Kit de Higiene",
      descripcion: "Jabón, papel higiénico, pasta y cepillo dental, toallas",
      stockActual: 25,
    },
    {
      tipoKit: "Mochila de Emergencia Familiar",
      descripcion: "Linterna, radio, botiquín, agua 3L, manta térmica, silbato",
      stockActual: 12,
    },
  ];
  for (const k of KITS) {
    const exists = await prisma.kitEmergencia.findFirst({ where: { tipoKit: k.tipoKit } });
    if (!exists)
      await prisma.kitEmergencia.create({
        data: { ...k, estadoKit: "ACTIVO", ubicacionAlmacen: "Almacén Central" },
      });
    console.log(`   ✓  ${k.tipoKit} (stock ${k.stockActual})`);
  }

  console.log(`\n✅ Seed completado. Contraseña de todos los usuarios: ${PASSWORD}\n`);
  console.log("   Email                       Rol");
  console.log("   ──────────────────────────────────────────────────");
  for (const u of USERS) {
    console.log(`   ${u.email.padEnd(28)}  ${u.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
