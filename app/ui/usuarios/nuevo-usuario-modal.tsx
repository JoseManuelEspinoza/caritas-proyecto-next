"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { crearUsuarioSistema } from "@/app/actions/usuarios";
import { ROLES_ALTA } from "@/app/lib/roles-alta";
import type { Role } from "@prisma/client";

const inputCls =
  "w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]";

export function NuevoUsuarioModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ nombres: "", apellidos: "", correo: "", role: ROLES_ALTA[0].value as Role });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const cerrar = () => {
    setOpen(false);
    setForm({ nombres: "", apellidos: "", correo: "", role: ROLES_ALTA[0].value as Role });
    setTempPassword(null);
    setCopiado(false);
    if (tempPassword) router.refresh();
  };

  const enviar = () => {
    startTransition(async () => {
      const res = await crearUsuarioSistema(form);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setTempPassword(res.tempPassword);
      toast.success("Usuario creado correctamente.");
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--caritas-green)] text-white rounded-xl text-sm font-semibold hover:bg-[#007a40] transition-colors shadow-sm flex-shrink-0"
      >
        <UserPlus className="w-4 h-4" />
        Nuevo usuario
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Nuevo usuario del sistema</h2>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {tempPassword ? (
              // ── Éxito: mostrar credenciales ──
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Usuario creado</span>
                </div>
                <p className="text-sm text-gray-600">
                  Comparte estas credenciales con <strong>{form.correo}</strong>. Deberá cambiar la
                  contraseña en su primer ingreso.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Usuario</span>
                    <span className="font-mono text-gray-800">{form.correo}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500">Contraseña temporal</span>
                    <span className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border">
                        {tempPassword}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          setCopiado(true);
                          toast.success("Contraseña copiada.");
                        }}
                        className="text-gray-400 hover:text-[var(--caritas-green)]"
                        title="Copiar"
                      >
                        {copiado ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </span>
                  </div>
                </div>
                <button
                  onClick={cerrar}
                  className="w-full py-2.5 bg-[var(--caritas-green)] text-white rounded-xl text-sm font-semibold hover:bg-[#007a40]"
                >
                  Listo
                </button>
              </div>
            ) : (
              // ── Formulario ──
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-500">Nombres *</span>
                    <input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} className={`mt-1 ${inputCls}`} />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Apellidos</span>
                    <input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} className={`mt-1 ${inputCls}`} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">Correo institucional *</span>
                  <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)}
                    placeholder="usuario@caritas.pe" className={`mt-1 ${inputCls}`} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Rol *</span>
                  <select value={form.role} onChange={(e) => set("role", e.target.value)} className={`mt-1 ${inputCls} bg-white`}>
                    {ROLES_ALTA.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Los brigadistas se registran desde el módulo de Brigadistas.
                  </span>
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cerrar} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={pending}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:bg-[#007a40] disabled:opacity-50"
                  >
                    {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Crear usuario
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
