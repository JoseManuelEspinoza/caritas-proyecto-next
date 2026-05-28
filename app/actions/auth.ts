'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'
import { createSession, deleteSession } from '@/app/lib/session'
import { getSession } from '@/app/lib/dal'
import { sendPasswordResetEmail } from '@/app/lib/email'
import { logger } from '@/app/lib/logger'
import { logAudit } from '@/app/lib/audit'
import {
  LoginSchema,
  SignupSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@/app/lib/definitions'
import type { FormState } from '@/app/lib/definitions'

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data
  let userId: string | undefined

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await logAudit({ action: 'LOGIN_FAILED', detail: { email } })
      return { message: 'Email o contraseña incorrectos.' }
    }

    await createSession(user.id, user.role)
    await logAudit({ userId: user.id, action: 'LOGIN' })
    userId = user.id
  } catch (err) {
    logger.error({ err }, 'Error en login')
    return { message: 'Ocurrió un error. Intenta de nuevo.' }
  }

  logger.info({ userId }, 'Login exitoso')
  redirect('/dashboard')
}

export async function signup(state: FormState, formData: FormData): Promise<FormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { name, email, password } = validated.data
  let userId: string | undefined

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { errors: { email: ['Este email ya está registrado.'] } }
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    await createSession(user.id, user.role)
    await logAudit({ userId: user.id, action: 'SIGNUP' })
    userId = user.id
  } catch (err) {
    logger.error({ err }, 'Error en signup')
    return { message: 'Ocurrió un error. Intenta de nuevo.' }
  }

  logger.info({ userId }, 'Registro exitoso')
  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()

  if (session?.userId) {
    await logAudit({ userId: session.userId, action: 'LOGOUT' })
    logger.info({ userId: session.userId }, 'Logout')
  }

  await deleteSession()
  redirect('/login')
}

export async function forgotPassword(state: FormState, formData: FormData): Promise<FormState> {
  const validated = ForgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email } = validated.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    })

    try {
      await sendPasswordResetEmail(email, token)
      await logAudit({ userId: user.id, action: 'FORGOT_PASSWORD' })
    } catch (err) {
      logger.error({ err }, 'Error al enviar correo de recuperación')
      return { message: 'No se pudo enviar el correo. Verifica la configuración de email.' }
    }
  }

  // Respuesta idéntica para no revelar si el email existe (anti-enumeración)
  return {
    message: 'Si el email está registrado, recibirás un enlace de recuperación en breve.',
  }
}

export async function resetPassword(
  token: string,
  state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
  })

  if (!user) {
    return { message: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' }
  }

  const hashedPassword = await bcrypt.hash(validated.data.password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  })

  await logAudit({ userId: user.id, action: 'RESET_PASSWORD' })
  logger.info({ userId: user.id }, 'Contraseña restablecida')
  redirect('/login?reset=ok')
}
