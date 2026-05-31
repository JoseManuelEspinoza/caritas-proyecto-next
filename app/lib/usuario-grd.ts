import 'server-only'
import { prisma } from './prisma'
import { verifySession } from './dal'

/**
 * Resuelve el `idUsuarioGRD` del usuario en sesión.
 *
 * Las tablas operativas del DER (planes, kits, actividades, cursos) referencian
 * `UsuarioGRD`, no la credencial técnica `User`. La sesión guarda el `User.id`
 * (= `UsuarioGRD.idCredencial`). Esta función vive en la capa de presentación
 * porque resuelve identidad; el resultado se inyecta a los casos de uso.
 *
 * Devuelve `null` si el usuario autenticado no tiene perfil GRD asociado.
 */
export async function getUsuarioGRDId(): Promise<string | null> {
  const session = await verifySession()
  const perfil = await prisma.usuarioGRD.findUnique({
    where: { idCredencial: session.userId },
    select: { idUsuarioGRD: true },
  })
  return perfil?.idUsuarioGRD ?? null
}
