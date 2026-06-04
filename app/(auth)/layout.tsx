export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-700 mb-4">
          <span className="text-white font-bold text-2xl">C</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cáritas Lima</h1>
        <p className="text-sm text-gray-500 mt-1">Sistema de gestión</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-md px-8 py-8">
        {children}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        © {new Date().getFullYear()} Cáritas Lima. Todos los derechos reservados.
      </p>
    </div>
  )
}
