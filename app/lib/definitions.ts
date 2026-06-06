import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres.")
  .regex(/[a-zA-Z]/, "Debe contener al menos una letra.")
  .regex(/[0-9]/, "Debe contener al menos un número.")
  .regex(/[^a-zA-Z0-9]/, "Debe contener al menos un carácter especial.")
  .trim();

export const LoginSchema = z.object({
  email: z.string().email("Email inválido.").trim(),
  password: z.string().min(1, "La contraseña es requerida.").trim(),
});

export const SignupSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").trim(),
  email: z.string().email("Email inválido.").trim(),
  password: passwordSchema,
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido.").trim(),
});

export const ResetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SessionPayload = {
  userId: string;
  role: string;
  expiresAt: Date;
};

export type FormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;
