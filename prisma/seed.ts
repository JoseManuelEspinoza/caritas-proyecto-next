import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

const PASSWORD = 'Caritas2026!'   // cumple: 8+ chars, letra, número, símbolo

const USERS = [
  { email: 'admin@caritas.pe',        name: 'Administrador del Sistema', role: 'ADMINISTRADOR'    },
  { email: 'especialista@caritas.pe', name: 'Carlos Méndez Paredes',     role: 'ESPECIALISTAGRD'  },
  { email: 'brigadista@caritas.pe',   name: 'Ana Torres Quispe',         role: 'BRIGADISTA'       },
  { email: 'comite@caritas.pe',       name: 'Comité de Donaciones',      role: 'COMITEDONACIONES' },
  { email: 'jefaogp@caritas.pe',      name: 'Jefa OGP',                  role: 'JEFAOGP'          },
]

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12)

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},                           // no sobreescribe si ya existe
      create: { email: u.email, name: u.name, password: hash, role: u.role as any },
    })
    console.log(`✓  ${user.role.padEnd(16)}  ${user.email}`)
  }

  console.log('\nTodos los usuarios creados con contraseña:', PASSWORD)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
