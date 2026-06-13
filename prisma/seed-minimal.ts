import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MODULO_GRD = "GRD";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Falta ${name} en .env.local`);
  }

  return value;
}

const password = requiredEnv("SEED_TEST_PASSWORD");

const MOBILE_SYNC_TEST_USER_ID =
  process.env.MOBILE_SYNC_TEST_USER_ID ||
  "d635589f-364b-49db-b0b3-2f1f411bae9b";

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  crearUsuarioGRD: boolean;
  idUsuarioGRD?: string;
  crearBrigadista?: boolean;
};

const USERS: SeedUser[] = [
  {
    email: process.env.SEED_ADMIN_EMAIL || "admin.demo@caritas.test",
    name: process.env.SEED_ADMIN_NAME || "Administrador Demo",
    role: Role.ADMINISTRADOR,
    crearUsuarioGRD: true,
  },
  {
    email: process.env.SEED_ESPECIALISTA_EMAIL || "especialista.demo@caritas.test",
    name: process.env.SEED_ESPECIALISTA_NAME || "Especialista GRD Demo",
    role: Role.ESPECIALISTAGRD,
    crearUsuarioGRD: true,
  },
  {
    email: process.env.SEED_BRIGADISTA_EMAIL || "brigadista.demo@caritas.test",
    name: process.env.SEED_BRIGADISTA_NAME || "Brigadista Demo",
    role: Role.BRIGADISTA,
    crearUsuarioGRD: true,
    idUsuarioGRD: MOBILE_SYNC_TEST_USER_ID,
    crearBrigadista: true,
  },
  {
    email: process.env.SEED_COMITE_EMAIL || "comite.demo@caritas.test",
    name: process.env.SEED_COMITE_NAME || "Comité Donaciones Demo",
    role: Role.COMITEDONACIONES,
    crearUsuarioGRD: false,
  },
  {
    email: process.env.SEED_JEFA_OGP_EMAIL || "jefaogp.demo@caritas.test",
    name: process.env.SEED_JEFA_OGP_NAME || "Jefa OGP Demo",
    role: Role.JEFAOGP,
    crearUsuarioGRD: false,
  },
];

function separarNombreCompleto(name: string) {
  const partes = name.trim().split(/\s+/);
  if (partes.length <= 1) {
    return { nombres: name, apellidos: "" };
  }

  return {
    nombres: partes.slice(0, Math.min(2, partes.length)).join(" "),
    apellidos: partes.slice(Math.min(2, partes.length)).join(" "),
  };
}

function slug(valor: string) {
  return valor
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

async function ensureParroquiaBase() {
  const existing = await prisma.parroquia.findFirst({
    where: { nombre: "Parroquia San Juan Bautista" },
  });

  if (existing) return existing;

  return prisma.parroquia.create({
    data: {
      nombre: "Parroquia San Juan Bautista",
      direccion: "Av. El Sol 123, San Juan de Lurigancho",
      referencia: "Parroquia base para pruebas mínimas GRD",
      estado: "ACTIVO",
    },
  });
}

async function ensureRol(nombreRol: string) {
  return prisma.rol.upsert({
    where: {
      nombreRol_modulo: {
        nombreRol,
        modulo: MODULO_GRD,
      },
    },
    update: {
      estado: "ACTIVO",
    },
    create: {
      nombreRol,
      modulo: MODULO_GRD,
      descripcion: `Rol ${nombreRol} para módulo GRD`,
      estado: "ACTIVO",
    },
  });
}

async function ensureCatalogo(nombreCatalogo: string, items: string[]) {
  const catalogo = await prisma.catalogoGRD.upsert({
    where: { nombreCatalogo },
    update: { estado: "ACTIVO" },
    create: {
      nombreCatalogo,
      descripcion: `Catálogo mínimo: ${nombreCatalogo}`,
      estado: "ACTIVO",
    },
  });

  for (let i = 0; i < items.length; i++) {
    const valor = items[i];
    const codigo = slug(valor);

    await prisma.catalogoDetalleGRD.upsert({
      where: {
        idCatalogoGRD_codigo: {
          idCatalogoGRD: catalogo.idCatalogoGRD,
          codigo,
        },
      },
      update: {
        valor,
        orden: i + 1,
        estado: "ACTIVO",
      },
      create: {
        idCatalogoGRD: catalogo.idCatalogoGRD,
        codigo,
        valor,
        orden: i + 1,
        estado: "ACTIVO",
      },
    });
  }
}

async function ensureTipoReferencia(codigoEntidad: string, nombreEntidad: string) {
  await prisma.tipoReferencia.upsert({
    where: { codigoEntidad },
    update: {
      nombreEntidad,
      estado: "ACTIVO",
    },
    create: {
      codigoEntidad,
      nombreEntidad,
      descripcion: `Referencia transversal para ${nombreEntidad}`,
      estado: "ACTIVO",
    },
  });
}

async function ensureKit(tipoKit: string, descripcion: string, stockActual: number) {
  const existing = await prisma.kitEmergencia.findFirst({
    where: { tipoKit },
  });

  if (existing) {
    await prisma.kitEmergencia.update({
      where: { idKitEmergencia: existing.idKitEmergencia },
      data: {
        descripcion,
        stockActual,
        estadoKit: "ACTIVO",
        ubicacionAlmacen: "Almacén Central",
      },
    });
    return;
  }

  await prisma.kitEmergencia.create({
    data: {
      tipoKit,
      descripcion,
      stockActual,
      estadoKit: "ACTIVO",
      ubicacionAlmacen: "Almacén Central",
    },
  });
}

async function main() {
  console.log("\n=== Seed mínimo GRD ===\n");

  const hash = await bcrypt.hash(password, 12);

  const parroquia = await ensureParroquiaBase();
  console.log(`✓ Parroquia base: ${parroquia.nombre}`);

  for (const u of USERS) {
    const rol = await ensureRol(u.role);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hash,
        estado: "ACTIVO",
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hash,
        estado: "ACTIVO",
      },
    });

    await prisma.credencialModulo.upsert({
      where: {
        idCredencial_modulo: {
          idCredencial: user.id,
          modulo: MODULO_GRD,
        },
      },
      update: { estado: "ACTIVO" },
      create: {
        idCredencial: user.id,
        modulo: MODULO_GRD,
        estado: "ACTIVO",
      },
    });

    await prisma.credencialRol.upsert({
      where: {
        idCredencial_idRol: {
          idCredencial: user.id,
          idRol: rol.idRol,
        },
      },
      update: { estado: "ACTIVO" },
      create: {
        idCredencial: user.id,
        idRol: rol.idRol,
        estado: "ACTIVO",
      },
    });

    console.log(`✓ Usuario: ${u.email} [${u.role}]`);

    if (!u.crearUsuarioGRD) continue;

    const { nombres, apellidos } = separarNombreCompleto(u.name);

let usuarioGRD = await prisma.usuarioGRD.findFirst({
  where: u.idUsuarioGRD
    ? {
        OR: [
          { idCredencial: user.id },
          { idUsuarioGRD: u.idUsuarioGRD },
        ],
      }
    : {
        idCredencial: user.id,
      },
});

if (!usuarioGRD) {
  usuarioGRD = await prisma.usuarioGRD.create({
    data: {
      ...(u.idUsuarioGRD ? { idUsuarioGRD: u.idUsuarioGRD } : {}),
      idCredencial: user.id,
      nombres,
      apellidos,
      correoReferencia: u.email,
      estado: "ACTIVO",
    },
  });
} else {
  usuarioGRD = await prisma.usuarioGRD.update({
    where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
    data: {
      idCredencial: user.id,
      nombres,
      apellidos,
      correoReferencia: u.email,
      estado: "ACTIVO",
    },
  });
}

    console.log(`  → UsuarioGRD: ${usuarioGRD.idUsuarioGRD}`);

    if (u.crearBrigadista) {
      const existingBrigadista = await prisma.brigadistaParroquial.findFirst({
        where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
      });

      if (!existingBrigadista) {
        await prisma.brigadistaParroquial.create({
          data: {
            idParroquia: parroquia.idParroquia,
            idUsuarioGRD: usuarioGRD.idUsuarioGRD,
            dni: "70000001",
            nombres,
            apellidos,
            celular: "900000001",
            correo: u.email,
            disponibilidad: "DISPONIBLE",
            estado: "ACTIVO",
          },
        });
      }

      console.log("  → Brigadista parroquial activo");
    }
  }

  await ensureCatalogo("Tipos de Evento", [
    "Incendio",
    "Inundación",
    "Sismo",
    "Derrumbe",
    "Deslizamiento",
    "Vendaval",
  ]);

  await ensureCatalogo("Niveles de Afectación", [
    "Leve",
    "Moderado",
    "Severo",
  ]);

  await ensureCatalogo("Necesidades", [
    "Alimentación",
    "Agua potable",
    "Refugio temporal",
    "Abrigo / Ropa",
    "Salud / Medicamentos",
    "Kit de limpieza",
    "Kit de higiene",
  ]);

  await ensureCatalogo("Fuentes de Alerta", [
    "Brigadista parroquial",
    "Defensa Civil",
    "Bomberos",
    "Comunidad / Vecinos",
  ]);

  await ensureTipoReferencia("INCIDENCIA", "Incidencia");
  await ensureTipoReferencia("ACTIVIDAD_PREVENTIVA", "Actividad preventiva");
  await ensureTipoReferencia("KIT_EMERGENCIA", "Kit de emergencia");
  await ensureTipoReferencia("PLAN_TRABAJO_GRD", "Plan de trabajo GRD");

  await ensureKit(
    "Kit de Limpieza",
    "Lejía, detergente, escoba, recogedor y artículos básicos de desinfección",
    20
  );
  await ensureKit(
    "Kit de Higiene",
    "Jabón, papel higiénico, pasta dental, cepillo dental y alcohol en gel",
    20
  );
  await ensureKit(
    "Kit de Víveres",
    "Alimentos no perecibles para atención inicial",
    20
  );
  await ensureKit(
    "Kit de Abrigo",
    "Frazadas, ropa de abrigo y artículos de protección térmica",
    15
  );
  await ensureKit(
    "Kit de Agua Segura",
    "Bidones, pastillas potabilizadoras y elementos para consumo seguro",
    15
  );

  console.log("\n✅ Seed mínimo completado.");
  console.log(`Contraseña de prueba: ${password}`);
  console.log(`Usuario móvil temporal: ${MOBILE_SYNC_TEST_USER_ID}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());