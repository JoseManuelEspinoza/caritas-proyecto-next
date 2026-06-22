import type { Role } from "@prisma/client";

/**
 * Roles que un administrador puede dar de alta desde la app (módulo Usuarios).
 * Vive aquí (no en la server action) porque un archivo "use server" solo puede
 * exportar funciones async; una constante exportada desde ahí llega `undefined`
 * al cliente. Este módulo es importable tanto por el cliente como por el server.
 *
 * Brigadista NO va aquí: se da de alta desde su propio módulo (con parroquia, DNI…).
 */
export const ROLES_ALTA: { value: Role; label: string }[] = [
  { value: "ESPECIALISTAGRD", label: "Especialista GRD" },
  { value: "COMITEDONACIONES", label: "Comité de Donaciones" },
  { value: "JEFAOGP", label: "Jefa OGP" },
  { value: "ADMINISTRADOR", label: "Administrador" },
];
