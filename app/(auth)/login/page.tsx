import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { loginConKeycloak } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión — Cáritas Lima",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Keycloak's UPDATE_PASSWORD required action (contraseña temporal) completes
  // correctamente pero devuelve authentication_expired en el primer callback.
  // Re-iniciar el flujo OAuth recoge la sesión ya establecida sin pedir credenciales.
  // signIn() modifica cookies → no se puede llamar en render; usar redirect en su lugar.
  if (error === "OAuthCallbackError") {
    redirect("/api/auth/signin/keycloak?callbackUrl=/dashboard");
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-[var(--caritas-green)]/10 rounded-2xl flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-[var(--caritas-green)]" />
      </div>
      <h2 className="text-lg md:text-xl mb-1" style={{ color: "var(--caritas-text)" }}>
        Iniciar Sesión
      </h2>
      <p className="text-sm text-gray-500 mb-6">Accede con tu cuenta institucional de Cáritas</p>

      <form
        action={async () => {
          "use server";
          await loginConKeycloak();
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--caritas-green)] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm"
        >
          <LogIn className="w-5 h-5" />
          Iniciar sesión
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-4">
        Conexión protegida con autenticación institucional.
      </p>
    </div>
  );
}
