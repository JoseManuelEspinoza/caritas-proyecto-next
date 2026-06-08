import { Prisma } from "@prisma/client";
import type { KitEmergencia as KitRow } from "@prisma/client";
import { KitEmergencia } from "../../domain/entities/kit/KitEmergencia";

export const KitMapper = {
  toDomain(row: KitRow): KitEmergencia {
    return KitEmergencia.desdePersistencia({
      id: row.idKitEmergencia,
      tipoKit: row.tipoKit,
      descripcion: row.descripcion,
      stockActual: row.stockActual,
      estadoKit: row.estadoKit,
      codigoAlmacen: row.codigoAlmacen,
      ubicacionAlmacen: row.ubicacionAlmacen,
      idParroquiaBeneficiaria: row.idParroquiaBeneficiaria,
    });
  },

  toPersistence(k: KitEmergencia): Prisma.KitEmergenciaUncheckedCreateInput {
    const s = k.snapshot;
    return {
      idKitEmergencia: s.id,
      tipoKit: s.tipoKit,
      descripcion: s.descripcion ?? undefined,
      stockActual: s.stockActual,
      estadoKit: s.estadoKit,
      codigoAlmacen: s.codigoAlmacen ?? undefined,
      ubicacionAlmacen: s.ubicacionAlmacen ?? undefined,
      idParroquiaBeneficiaria: s.idParroquiaBeneficiaria ?? undefined,
    };
  },
};
