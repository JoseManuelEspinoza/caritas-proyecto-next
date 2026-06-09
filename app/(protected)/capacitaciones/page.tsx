import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import {
  listarCursosConSesiones,
  listarEspecialistas,
  listarMisCursos,
  listarCursosDisponiblesBrigadista,
} from "@/app/actions/capacitaciones";
import { AdminCapacitaciones } from "@/app/ui/capacitaciones/admin-capacitaciones";
import { EspecialistaCapacitaciones } from "@/app/ui/capacitaciones/especialista-capacitaciones";
import { BrigadistaCapacitaciones } from "@/app/ui/capacitaciones/brigadista-capacitaciones";

export default async function CapacitacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "brigadista"].includes(role)) redirect("/dashboard");

  if (role === "admin") {
    const [cursos, especialistas] = await Promise.all([
      listarCursosConSesiones(),
      listarEspecialistas(),
    ]);
    return <AdminCapacitaciones cursos={cursos} especialistas={especialistas} />;
  }

  if (role === "especialistaGRD") {
    const idGRD = await getUsuarioGRDId();
    const cursos = await listarCursosConSesiones(idGRD ?? undefined);
    return <EspecialistaCapacitaciones cursos={cursos} />;
  }

  // brigadista
  const [inscritosCursos, disponiblesCursos] = await Promise.all([
    listarMisCursos(),
    listarCursosDisponiblesBrigadista(),
  ]);
  return (
    <BrigadistaCapacitaciones
      inscritosCursos={inscritosCursos}
      disponiblesCursos={disponiblesCursos}
    />
  );
}
