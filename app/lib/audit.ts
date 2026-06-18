import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "SIGNUP"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD";

export type GRDAction = "CREAR" | "EDITAR" | "ASIGNAR" | "VOTAR" | "OBSERVAR";

export const GRD_ACTIONS = new Set<string>(["CREAR", "EDITAR", "ASIGNAR", "VOTAR", "OBSERVAR"]);

export async function logAudit({
  userId,
  action,
  detail,
}: {
  userId?: string;
  action: AuditAction;
  detail?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error al guardar audit log");
  }
}

export async function logGRDAction({
  userId,
  action,
  entity,
  entityId,
  entityName,
  module,
  field,
  prevValue,
  newValue,
  notes,
}: {
  userId?: string;
  action: GRDAction;
  entity: string;
  entityId: string;
  entityName: string;
  module?: string;
  field?: string;
  prevValue?: string;
  newValue?: string;
  notes?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        detail: {
          entity,
          entityId,
          entityName,
          module,
          field,
          prevValue,
          newValue,
          notes,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error al guardar GRD audit log");
  }
}
