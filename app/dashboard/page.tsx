import { verifySession } from '@/app/lib/dal'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const session = await verifySession()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-gray-900">Cáritas Lima</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Bienvenido. Rol:{' '}
          <span className="font-medium text-red-700">{String(session.role)}</span>
        </p>
      </main>
    </div>
  )
}
