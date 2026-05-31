import type { Metadata } from 'next'
import ClientLogin from './client-login'

export const metadata: Metadata = {
  title: 'Iniciar sesión — Cáritas Lima',
}

export default function LoginPage() {
  return (
    <>
      <h2
        className="text-lg md:text-xl mb-5 md:mb-6 text-center"
        style={{ color: 'var(--caritas-text)' }}
      >
        Iniciar Sesión
      </h2>
      <ClientLogin />
    </>
  )
}
