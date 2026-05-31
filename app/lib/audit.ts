import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { logger } from './logger'

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD'

export async function logAudit({
  userId,
  action,
  detail,
}: {
  userId?: string
  action: AuditAction
  detail?: Record<string, unknown>
}) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? null, action, detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined },
    })
  } catch (err) {
    logger.error({ err }, 'Error al guardar audit log')
  }
}
