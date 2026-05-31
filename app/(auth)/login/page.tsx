import type { Metadata } from 'next'
import { LoginForm } from '@/app/ui/auth/login-form'

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
      <LoginForm />
    </>
  )
}
