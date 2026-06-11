import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole } from "@/app/lib/roles";
import { IncidentForm } from "@/app/ui/grd/incident-form";
import type { CreateIncidenteData, FamiliaForm, PersonaForm } from "@/app/actions/incidents";

export default async function EditarIncidentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  // Solo admin y especialista pueden editar
  if (role !== "admin" && role !== "especialistaGRD") redirect(`/grd/${id}`);

  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: id, deletedAt: null },
    include: {
      aviso: true,
      gruposFamiliares: {
        include: {
          personas: true,
        },
        orderBy: { nombreReferencia: "asc" },
      },
    },
  });

  if (!inc) notFound();
  // Solo editar si está ABIERTO
  if (inc.estadoActual !== "ABIERTO") redirect(`/grd/${id}`);

  // ─── Parsear contextoCaso ──────────────────────────────────────────────────
  let ctx: Record<string, any> = {};
  try {
    ctx = JSON.parse(inc.contextoCaso ?? "{}");
  } catch {
    /* vacío */
  }

  // ─── Convertir grupos familiares ──────────────────────────────────────────
  // Excluir el grupo "Personas individuales" de la lista de familias
  const gruposFamilia = inc.gruposFamiliares.filter(
    (g) => g.nombreReferencia !== "Personas individuales"
  );
  const grupoIndividual = inc.gruposFamiliares.find(
    (g) => g.nombreReferencia === "Personas individuales"
  );

  const familias: FamiliaForm[] = gruposFamilia.map((g) => ({
    id: g.idGrupoFamiliar, // se usa como clave en el formulario
    nombre: g.nombreReferencia ?? "Grupo familiar",
    observaciones: g.observaciones ?? "",
  }));

  // ─── Convertir personas ───────────────────────────────────────────────────
  function calcularEdad(fn: Date | null): string {
    if (!fn) return "";
    return String(new Date().getFullYear() - new Date(fn).getFullYear());
  }

  function splitApellidos(apellidos: string | null): { pat: string; mat: string } {
    if (!apellidos) return { pat: "", mat: "" };
    const partes = apellidos.trim().split(" ");
    return { pat: partes[0] ?? "", mat: partes.slice(1).join(" ") };
  }

  const personas: PersonaForm[] = inc.gruposFamiliares.flatMap((g) => {
    const esIndividual = g.nombreReferencia === "Personas individuales";
    return g.personas.map((p) => {
      const { pat, mat } = splitApellidos(p.apellidos);
      return {
        id: p.idPersonaAfectada,
        tipoDoc: p.tipoDocumento ?? "DNI",
        dni: p.numeroDocumento ?? "",
        nombre: p.nombres,
        apellidoPaterno: pat,
        apellidoMaterno: mat,
        edad: calcularEdad(p.fechaNacimiento),
        genero: p.sexo ?? "Femenino",
        celular: p.telefono ?? "",
        parentesco: p.parentesco ?? "",
        situacionActual: p.condicionEspecial ?? "",
        // Si pertenece a un grupo familiar real, linkar; si es individual, sin familiaId
        familiaId: esIndividual ? undefined : g.idGrupoFamiliar,
      } satisfies PersonaForm;
    });
  });

  // ─── Necesidades desde el contexto ───────────────────────────────────────
  const necesidadesBase = ["Alimentos", "Ropa", "Atención médica", "Materiales de construcción"];
  const necesidadesGuardadas: string[] = ctx.necesidades ?? [];
  const necesidades = necesidadesGuardadas.filter((n) => necesidadesBase.includes(n));
  const necesidadOtra = necesidadesGuardadas.find((n) => !necesidadesBase.includes(n)) ?? "";

  // ─── Construir initialData ────────────────────────────────────────────────
  const initialData: CreateIncidenteData = {
    reportaDni: "", // no guardamos DNI del informante
    reportaNombre: inc.aviso?.nombreInformante ?? "",
    reportaTel: inc.aviso?.telefonoInformante ?? "",
    reportaRol: inc.aviso?.medioAviso ?? "",
    fechaReporte: inc.fechaRegistro.toISOString().slice(0, 16),
    fechaSuceso: inc.fechaRegistro.toISOString().split("T")[0],
    horaSuceso: "",
    categoria: inc.tipoEvento ?? "",
    pais: ctx.pais ?? "Perú",
    region: ctx.region ?? "Lima Metropolitana",
    distrito: ctx.distrito ?? "",
    parroquia: ctx.parroquia ?? "",
    direccion: inc.direccionEvento ?? "",
    referencia: ctx.referencia ?? "",
    descripcion: inc.descripcionEvento ?? "",
    causa: ctx.causa ?? "",
    familias,
    personas,
    necesidades,
    necesidadOtra,
    necesidadesObs: ctx.necesidadesObs ?? "",
    nivelAfectacion: inc.gravedad ?? "Moderado",
    lat: inc.latitud != null ? Number(inc.latitud) : null,
    lng: inc.longitud != null ? Number(inc.longitud) : null,
  };

  const parroquias = await prisma.parroquia.findMany({
    where: { estado: "ACTIVO" },
    select: { nombre: true, latitud: true, longitud: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <IncidentForm
      initialData={initialData}
      incidenciaId={id}
      codigoCaso={inc.codigoCaso ?? ""}
      parroquiasSistema={parroquias.map((p) => ({
        nombre: p.nombre,
        lat: p.latitud != null ? Number(p.latitud) : null,
        lng: p.longitud != null ? Number(p.longitud) : null,
      }))}
    />
  );
}
