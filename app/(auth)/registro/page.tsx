import type { Metadata } from 'next'
import { SignupForm } from '@/app/ui/auth/signup-form'

export const metadata: Metadata = {
  title: 'Crear cuenta — Cáritas Lima',
}

export default function RegistroPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear cuenta</h2>
      <SignupForm />
    </>
  )
}
