import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'
import { redirect } from 'next/navigation'
import { makeCatalogoUseCases } from '@/core/infrastructure/factories/makeCatalogoUseCases'
import type { DetalleOutput } from '@/core/application/use-cases/catalogos/GestionarCatalogos.usecase'
import { CatalogosModule } from '@/app/ui/catalogos/catalogos-module'

export default async function CatalogosPage() {
  const session = await verifySession()
  if (toFrontendRole(session.role) !== 'admin') redirect('/dashboard')

  const uc = makeCatalogoUseCases()
  const catalogos = await uc.listarCatalogos.execute()

  const detallesByCatalogo: Record<string, DetalleOutput[]> = {}
  await Promise.all(
    catalogos.map(async (c) => {
      detallesByCatalogo[c.id] = await uc.listarDetalles.execute(c.id)
    }),
  )

  return <CatalogosModule catalogos={catalogos} detallesByCatalogo={detallesByCatalogo} />
}
