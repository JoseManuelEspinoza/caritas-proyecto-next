import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { resetPassword } from '@/app/actions/auth'
import { ResetForm } from '@/app/ui/auth/reset-form'

export const metadata: Metadata = {
  title: 'Nueva contraseña — Cáritas Lima',
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!user) {
    notFound()
  }

  const action = resetPassword.bind(null, token)

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Nueva contraseña</h2>
      <p className="text-sm text-gray-600 mb-6">
        Elige una contraseña segura para tu cuenta.
      </p>
      <ResetForm action={action} />
    </>
  )
}
