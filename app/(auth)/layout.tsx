import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo y subtítulo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center mb-4 md:mb-6">
            <Image
              src="/caritas-logo.png"
              alt="Cáritas Lima"
              width={240}
              height={128}
              className="h-24 md:h-32 w-auto"
              priority
            />
          </div>
          <p className="text-sm md:text-base" style={{ color: 'var(--caritas-text)' }}>
            Sistema de Gestión de Riesgo de Desastres
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white shadow-xl p-6 md:p-8"
          style={{ border: '1px solid var(--caritas-border)', borderRadius: '12px' }}
        >
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Cáritas Lima. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </div>
  )
}
