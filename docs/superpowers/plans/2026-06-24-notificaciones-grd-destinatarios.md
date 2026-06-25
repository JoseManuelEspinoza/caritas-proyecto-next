# Notificaciones GRD — Ver Destinatarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-send recipient preview and post-send notification history to the GRD incident flow, so users can see who will be notified before acting, and who was notified after each step.

**Architecture:** Extend `Notificacion` with an optional `idIncidencia` FK so all GRD notifications are linked to their incident. A new history API route serves grouped records with recipient names. A `getDestinatariosNotificacion` server action resolves who would be notified for each step. Two new client components surface this: `DestinatariosPreview` (near action buttons) and `NotificacionesHistorial` (in ResumenStep section 11).

**Tech Stack:** Next.js 16 App Router, Prisma ORM, Vitest, Tailwind CSS, Lucide React.

## Global Constraints

- Test runner: `pnpm test` → `vitest run`. No globals — all test imports are explicit from `"vitest"`.
- Run a single test file: `pnpm test -- --reporter=verbose tests/path/file.test.ts`
- Prisma client: always import `{ prisma }` from `"@/app/lib/prisma"`.
- Session: always call `verifySession()` from `"@/app/lib/dal"` at the top of any server function that needs auth.
- No new third-party npm packages.
- Dynamic route params in Next.js 16 are a `Promise` — always `await params` before destructuring.
- `data.idIncidencia` is the incidencia ID in `IncidenciaDetalleOutput` (used by `RevisionStep`, `ResumenStep`).
- `current.id` is the incidencia ID in `donaciones-module.tsx`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `idIncidencia?` + index to `Notificacion`; inverse relation on `Incidencia` |
| `app/lib/notificaciones.ts` | Modify | Add `incidenciaId?` param to all 7 functions |
| `app/actions/incidents.ts` | Modify | Update 6 notification call-sites; add `getDestinatariosNotificacion` server action |
| `app/api/notificaciones/incidencia/[id]/route.ts` | Create | `GET` — returns grouped notification history for an incidencia |
| `app/ui/grd/incidente/components/DestinatariosPreview.tsx` | Create | Client component: pre-send recipient list |
| `app/ui/grd/incidente/components/NotificacionesHistorial.tsx` | Create | Client component: post-send notification history |
| `app/ui/grd/incidente/steps/RevisionStep.tsx` | Modify | Add `DestinatariosPreview` before "Enviar al Comité" buttons |
| `app/ui/donaciones/donaciones-module.tsx` | Modify | Add `DestinatariosPreview` near "Votar" button in the detail panel |
| `app/ui/grd/incidente/steps/ResumenStep.tsx` | Modify | Add `NotificacionesHistorial` as section 11 |
| `tests/unit/notificaciones/getDestinatariosNotificacion.test.ts` | Create | Unit tests for the server action |
| `tests/api/notificaciones-incidencia.test.ts` | Create | Integration tests for the history API route |

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Notificacion.idIncidencia: String?` column in DB; `Incidencia.notificaciones` inverse relation available to Prisma client.

- [ ] **Step 1: Add field + index to `model Notificacion`**

In `prisma/schema.prisma`, find `model Notificacion` and replace the entire block with:

```prisma
model Notificacion {
  idNotificacion String   @id @default(uuid())
  userId         String
  tipo           String
  titulo         String
  mensaje        String   @db.Text
  enlace         String?
  leida          Boolean  @default(false)
  createdAt      DateTime @default(now())

  idIncidencia String?
  incidencia   Incidencia? @relation(fields: [idIncidencia], references: [idIncidencia], onDelete: SetNull)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, leida, createdAt])
  @@index([idIncidencia, tipo, createdAt])
  @@map("notificaciones")
}
```

- [ ] **Step 2: Add inverse relation to `model Incidencia`**

In `prisma/schema.prisma`, in `model Incidencia`, add the inverse relation after the existing `rondasVotacionComite` line:

```prisma
  rondasVotacionComite RondaVotacionComite[]
  notificaciones       Notificacion[]
  seguimientos         SeguimientoIncidencia[]
```

- [ ] **Step 3: Run migration**

```bash
pnpm prisma migrate dev --name add-incidencia-to-notificacion
```

Expected output: `Your database is now in sync with your schema.` New column `id_incidencia` (nullable) added to `notificaciones` table; new index created. Prisma client is regenerated automatically.

---

### Task 2: Update notification library and GRD callers

**Files:**
- Modify: `app/lib/notificaciones.ts`
- Modify: `app/actions/incidents.ts`

**Interfaces:**
- Consumes: `Notificacion.idIncidencia` from Task 1.
- Produces (updated signatures — all new params are optional and at the end, so existing callers still compile):
  - `notificarUsuario(userId, tipo, titulo, mensaje, enlace?, incidenciaId?): void`
  - `notificarRoles(roles, tipo, titulo, mensaje, enlace?, incidenciaId?): void`
  - `notificarBrigadistas(ids, tipo, titulo, mensaje, enlace?, incidenciaId?): void`
  - `notificarPorEmail(email, tipo, titulo, mensaje, enlace?, incidenciaId?): void`
- Produces (new export):
  - `getDestinatariosNotificacion(step: "informe" | "decision", incidenciaId: string): Promise<DestinatarioNotif[]>`
  - `type DestinatarioNotif = { nombre: string; email: string; rol: string }`

- [ ] **Step 1: Write the failing test for `getDestinatariosNotificacion`**

Create `tests/unit/notificaciones/getDestinatariosNotificacion.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({ verifySession: vi.fn() }));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    incidencia: { findUnique: vi.fn() },
  },
}));

import { getDestinatariosNotificacion } from "@/app/actions/incidents";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

const SESSION = { isAuth: true as const, userId: "u-1", role: "GRD", name: "X", email: "x@x.com" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION as any);
});

describe("getDestinatariosNotificacion — step: informe", () => {
  it("[positivo] devuelve miembros activos del comité y jefa OGP", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { name: "Ana Torres", email: "ana@x.com", role: "COMITEDONACIONES" },
      { name: "María Díaz", email: "maria@x.com", role: "JEFAOGP" },
    ] as any);

    const result = await getDestinatariosNotificacion("informe", "inc-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ nombre: "Ana Torres", email: "ana@x.com", rol: "COMITEDONACIONES" });
    expect(result[1]).toEqual({ nombre: "María Díaz", email: "maria@x.com", rol: "JEFAOGP" });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { in: ["COMITEDONACIONES", "JEFAOGP"] }, estado: "ACTIVO" },
      })
    );
  });

  it("[borde] sin usuarios activos devuelve array vacío", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    const result = await getDestinatariosNotificacion("informe", "inc-1");
    expect(result).toEqual([]);
  });
});

describe("getDestinatariosNotificacion — step: decision", () => {
  it("[positivo] devuelve el responsable GRD de la incidencia", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      usuarioResponsable: {
        nombres: "Carlos",
        apellidos: "Mamani",
        correoReferencia: null,
        credencial: { email: "carlos@x.com", role: "ESPECIALISTAGRD" },
      },
    } as any);

    const result = await getDestinatariosNotificacion("decision", "inc-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ nombre: "Carlos Mamani", email: "carlos@x.com", rol: "ESPECIALISTAGRD" });
  });

  it("[borde] incidencia sin responsable asignado devuelve array vacío", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      usuarioResponsable: null,
    } as any);
    const result = await getDestinatariosNotificacion("decision", "inc-1");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
pnpm test -- --reporter=verbose tests/unit/notificaciones/getDestinatariosNotificacion.test.ts
```

Expected: FAIL — `getDestinatariosNotificacion` is not exported from `@/app/actions/incidents`.

- [ ] **Step 3: Replace `app/lib/notificaciones.ts` with updated version**

```ts
import { prisma } from "@/app/lib/prisma";
import type { Role } from "@prisma/client";

export type TipoNotificacion =
  | "INCIDENCIA_NUEVA"
  | "RESPONSABLE_ASIGNADO"
  | "BRIGADISTA_ASIGNADO"
  | "INFORME_ENVIADO_COMITE"
  | "DECISION_APROBADO"
  | "DECISION_OBSERVADO"
  | "DECISION_RECHAZADO"
  | "CAPACITACION_PUBLICADA"
  | "CAPACITACION_INSCRIPCION"
  | "CAPACITACION_CERTIFICADO";

async function crearNotificacion(
  userId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  await prisma.notificacion.create({
    data: {
      userId,
      tipo,
      titulo,
      mensaje,
      enlace: enlace ?? null,
      idIncidencia: incidenciaId ?? null,
    },
  });
}

async function crearNotificacionParaRoles(
  roles: Role[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  const usuarios = await prisma.user.findMany({
    where: { role: { in: roles }, estado: "ACTIVO" },
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  await prisma.notificacion.createMany({
    data: usuarios.map((u) => ({
      userId: u.id,
      tipo,
      titulo,
      mensaje,
      enlace: enlace ?? null,
      idIncidencia: incidenciaId ?? null,
    })),
  });
}

async function crearNotificacionParaBrigadistas(
  brigadistaIds: string[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  const brigadistas = await prisma.brigadistaParroquial.findMany({
    where: { idBrigadistaParroquial: { in: brigadistaIds } },
    select: { idUsuarioGRD: true, correo: true },
  });

  const userIds = new Set<string>();

  const usuarioGRDIds = brigadistas.filter((b) => b.idUsuarioGRD).map((b) => b.idUsuarioGRD!);
  if (usuarioGRDIds.length > 0) {
    const usuarios = await prisma.usuarioGRD.findMany({
      where: { idUsuarioGRD: { in: usuarioGRDIds } },
      select: { idCredencial: true },
    });
    usuarios.forEach((u) => userIds.add(u.idCredencial));
  }

  const correosSinLink = brigadistas
    .filter((b) => !b.idUsuarioGRD && b.correo)
    .map((b) => b.correo!);
  if (correosSinLink.length > 0) {
    const usuariosPorCorreo = await prisma.user.findMany({
      where: { email: { in: correosSinLink } },
      select: { id: true },
    });
    usuariosPorCorreo.forEach((u) => userIds.add(u.id));
  }

  if (userIds.size === 0) return;

  await prisma.notificacion.createMany({
    data: [...userIds].map((userId) => ({
      userId,
      tipo,
      titulo,
      mensaje,
      enlace: enlace ?? null,
      idIncidencia: incidenciaId ?? null,
    })),
  });
}

export function notificarUsuario(
  userId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  crearNotificacion(userId, tipo, titulo, mensaje, enlace, incidenciaId).catch((e) =>
    console.error("[Notif] Error creando notificación:", e)
  );
}

export function notificarRoles(
  roles: Role[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  crearNotificacionParaRoles(roles, tipo, titulo, mensaje, enlace, incidenciaId).catch((e) =>
    console.error("[Notif] Error creando notificaciones por rol:", e)
  );
}

export function notificarPorEmail(
  email: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  prisma.user
    .findUnique({ where: { email }, select: { id: true } })
    .then((u) => {
      if (!u) return;
      return crearNotificacion(u.id, tipo, titulo, mensaje, enlace, incidenciaId);
    })
    .catch((e) => console.error("[Notif] Error notificando por email:", e));
}

export function notificarBrigadistas(
  brigadistaIds: string[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string,
  incidenciaId?: string
) {
  crearNotificacionParaBrigadistas(
    brigadistaIds,
    tipo,
    titulo,
    mensaje,
    enlace,
    incidenciaId
  ).catch((e) => console.error("[Notif] Error creando notificaciones a brigadistas:", e));
}
```

- [ ] **Step 4: Update notification call-sites in `app/actions/incidents.ts`**

Make the following 6 targeted edits (each is adding a single `incidenciaId` argument):

**a) `notificarEquipoAsignado` — `notificarBrigadistas` call for responsable (line ~63):**
```ts
notificarBrigadistas(
  [responsableId],
  "RESPONSABLE_ASIGNADO",
  "Eres el responsable del equipo de respuesta",
  detalle,
  `/grd/${incidenciaId}`,
  incidenciaId   // ← add
);
```

**b) `notificarEquipoAsignado` — `notificarBrigadistas` call for equipo (line ~72):**
```ts
notificarBrigadistas(
  equipoIds,
  "BRIGADISTA_ASIGNADO",
  "Has sido asignado a un caso de emergencia",
  detalle,
  `/grd/${incidenciaId}`,
  incidenciaId   // ← add
);
```

**c) `createIncidente` — `notificarRoles` call (line ~145):**
```ts
notificarRoles(
  ["ESPECIALISTAGRD", "ADMINISTRADOR"],
  "INCIDENCIA_NUEVA",
  "Nueva incidencia registrada",
  `Se registró: ${data.categoria} en ${data.distrito}`,
  `/grd/${id}`,
  id             // ← add
);
```

**d) `assignBrigadista` — `notificarBrigadistas` call (line ~215):**
```ts
notificarBrigadistas(
  [brigadistaId],
  "BRIGADISTA_ASIGNADO",
  "Has sido asignado a una incidencia",
  instrucciones?.trim()
    ? `Instrucciones: ${instrucciones.trim()}`
    : "Revisa el sistema para ver los detalles.",
  `/grd/${incidenciaId}`,
  incidenciaId   // ← add
);
```

**e) `saveInformeEvaluacion` — `notificarRoles` call (line ~354):**
```ts
notificarRoles(
  ["COMITEDONACIONES", "JEFAOGP"],
  "INFORME_ENVIADO_COMITE",
  "Informe enviado al Comité",
  `El especialista GRD envió el informe del caso "${titulo}" para su evaluación.`,
  `/grd/${incidenciaId}`,
  incidenciaId   // ← add
);
```

**f) `notificarDecisionComite` — `notificarUsuario` call (line ~457):**
```ts
notificarUsuario(
  userId,
  tipoNotif,
  titulos[decision],
  observaciones?.trim()
    ? `"${incTitulo}" — ${observaciones.trim()}`
    : `"${incTitulo}"`,
  `/grd/${incidenciaId}`,
  incidenciaId   // ← add
);
```

- [ ] **Step 5: Add `getDestinatariosNotificacion` to `app/actions/incidents.ts`**

Append at the end of `app/actions/incidents.ts` (after `deleteGrupoFamiliarCampo`).
Also add `import type { Role } from "@prisma/client";` near the top of the file with the other imports.

```ts
// ─── Preview de destinatarios ────────────────────────────────────────────────

export type DestinatarioNotif = { nombre: string; email: string; rol: string };

export async function getDestinatariosNotificacion(
  step: "informe" | "decision",
  incidenciaId: string
): Promise<DestinatarioNotif[]> {
  await verifySession();

  if (step === "informe") {
    const roles = ["COMITEDONACIONES", "JEFAOGP"] as Role[];
    const usuarios = await prisma.user.findMany({
      where: { role: { in: roles }, estado: "ACTIVO" },
      select: { name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return usuarios.map((u) => ({ nombre: u.name ?? u.email, email: u.email, rol: u.role }));
  }

  // step === "decision": notify the GRD responsible for this incidencia
  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: incidenciaId },
    select: {
      usuarioResponsable: {
        select: {
          nombres: true,
          apellidos: true,
          correoReferencia: true,
          credencial: { select: { email: true, role: true } },
        },
      },
    },
  });

  const resp = inc?.usuarioResponsable;
  if (!resp) return [];

  const nombre = [resp.nombres, resp.apellidos].filter(Boolean).join(" ");
  const email = resp.correoReferencia ?? resp.credencial?.email ?? "";
  const rol = resp.credencial?.role ?? "ESPECIALISTAGRD";
  return [{ nombre, email, rol }];
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test -- --reporter=verbose tests/unit/notificaciones/getDestinatariosNotificacion.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 7: Run full test suite**

```bash
pnpm test
```

Expected: All existing tests pass.

---

### Task 3: History API endpoint

**Files:**
- Create: `app/api/notificaciones/incidencia/[id]/route.ts`
- Create: `tests/api/notificaciones-incidencia.test.ts`

**Interfaces:**
- Consumes: `Notificacion.idIncidencia` from Task 1.
- Produces: `GET /api/notificaciones/incidencia/:incidenciaId`
  ```ts
  // Response type (200):
  type NotifHistorialGroup = {
    tipo: string;
    titulo: string;
    enviadoAt: string;       // ISO — timestamp of the first record in the group
    destinatarios: {
      nombre: string;
      email: string;
      rol: string;
    }[];
  }[];
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/api/notificaciones-incidencia.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({ verifySession: vi.fn() }));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    notificacion: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/notificaciones/incidencia/[id]/route";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

const SESSION = { isAuth: true as const, userId: "u-1", role: "GRD", name: "X", email: "x@x.com" };

function makeRequest(id: string) {
  return new Request(`http://localhost/api/notificaciones/incidencia/${id}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/notificaciones/incidencia/[id]", () => {
  it("[negativo] sin sesión válida → 401", async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error("No autenticado"));
    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(401);
  });

  it("[positivo] agrupa por tipo, enviadoAt es el timestamp del primer registro del grupo", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([
      {
        tipo: "INCIDENCIA_NUEVA",
        titulo: "Nueva incidencia registrada",
        createdAt: new Date("2026-06-23T10:00:00Z"),
        user: { name: "Admin", email: "admin@x.com", role: "ADMINISTRADOR" },
      },
      {
        tipo: "INFORME_ENVIADO_COMITE",
        titulo: "Informe enviado al Comité",
        createdAt: new Date("2026-06-23T14:32:00Z"),
        user: { name: "Ana Torres", email: "ana@x.com", role: "COMITEDONACIONES" },
      },
      {
        tipo: "INFORME_ENVIADO_COMITE",
        titulo: "Informe enviado al Comité",
        createdAt: new Date("2026-06-23T14:32:01Z"),
        user: { name: "Luis Ríos", email: "luis@x.com", role: "COMITEDONACIONES" },
      },
    ] as any);

    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(2);

    expect(body[0].tipo).toBe("INCIDENCIA_NUEVA");
    expect(body[0].enviadoAt).toBe("2026-06-23T10:00:00.000Z");
    expect(body[0].destinatarios).toHaveLength(1);
    expect(body[0].destinatarios[0].nombre).toBe("Admin");

    expect(body[1].tipo).toBe("INFORME_ENVIADO_COMITE");
    expect(body[1].enviadoAt).toBe("2026-06-23T14:32:00.000Z");
    expect(body[1].destinatarios).toHaveLength(2);
    expect(body[1].destinatarios[0].nombre).toBe("Ana Torres");
    expect(body[1].destinatarios[1].nombre).toBe("Luis Ríos");

    expect(prisma.notificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idIncidencia: "inc-1" } })
    );
  });

  it("[positivo] sin notificaciones devuelve array vacío", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
pnpm test -- --reporter=verbose tests/api/notificaciones-incidencia.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route handler**

Create `app/api/notificaciones/incidencia/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type NotifRow = {
  tipo: string;
  titulo: string;
  createdAt: Date;
  user: { name: string | null; email: string; role: string };
};

type NotifHistorialGroup = {
  tipo: string;
  titulo: string;
  enviadoAt: string;
  destinatarios: { nombre: string; email: string; rol: string }[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const rows: NotifRow[] = await prisma.notificacion.findMany({
    where: { idIncidencia: id },
    orderBy: { createdAt: "asc" },
    select: {
      tipo: true,
      titulo: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  });

  // Group by tipo in insertion order; enviadoAt is the first record's timestamp
  const groupMap = new Map<string, NotifHistorialGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.tipo)) {
      groupMap.set(row.tipo, {
        tipo: row.tipo,
        titulo: row.titulo,
        enviadoAt: row.createdAt.toISOString(),
        destinatarios: [],
      });
    }
    groupMap.get(row.tipo)!.destinatarios.push({
      nombre: row.user.name ?? row.user.email,
      email: row.user.email,
      rol: row.user.role,
    });
  }

  return NextResponse.json([...groupMap.values()]);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --reporter=verbose tests/api/notificaciones-incidencia.test.ts
```

Expected: 3 tests pass.

---

### Task 4: `DestinatariosPreview` component + integrations

**Files:**
- Create: `app/ui/grd/incidente/components/DestinatariosPreview.tsx`
- Modify: `app/ui/grd/incidente/steps/RevisionStep.tsx`
- Modify: `app/ui/donaciones/donaciones-module.tsx`

**Interfaces:**
- Consumes: `getDestinatariosNotificacion` and `DestinatarioNotif` from `@/app/actions/incidents` (Task 2).
- Produces: `<DestinatariosPreview step="informe" | "decision" incidenciaId={string} />`

- [ ] **Step 1: Create `DestinatariosPreview`**

Create `app/ui/grd/incidente/components/DestinatariosPreview.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Info, ChevronDown, ChevronUp, Users } from "lucide-react";
import { getDestinatariosNotificacion } from "@/app/actions/incidents";
import type { DestinatarioNotif } from "@/app/actions/incidents";

const ROL_LABEL: Record<string, string> = {
  COMITEDONACIONES: "Comité de Donaciones",
  JEFAOGP: "Jefa OGP",
  ESPECIALISTAGRD: "Especialista GRD",
  ADMINISTRADOR: "Administrador",
};

interface Props {
  step: "informe" | "decision";
  incidenciaId: string;
}

export function DestinatariosPreview({ step, incidenciaId }: Props) {
  const [destinatarios, setDestinatarios] = useState<DestinatarioNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDestinatariosNotificacion(step, incidenciaId)
      .then(setDestinatarios)
      .catch(() => setDestinatarios([]))
      .finally(() => setLoading(false));
  }, [step, incidenciaId]);

  if (loading) return null;

  if (destinatarios.length === 0) {
    return (
      <p className="text-xs text-amber-600 flex items-center gap-1">
        <Info className="w-3 h-3 shrink-0" />
        No hay destinatarios configurados para este paso.
      </p>
    );
  }

  const n = destinatarios.length;
  return (
    <div className="text-xs text-gray-500">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        <Users className="w-3 h-3 shrink-0" />
        <span>
          {n} {n === 1 ? "persona recibirá" : "personas recibirán"} esta notificación
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <ul className="mt-1.5 pl-4 space-y-0.5">
          {destinatarios.map((d) => (
            <li key={d.email} className="flex items-center gap-1.5">
              <span className="font-medium text-gray-700">{d.nombre}</span>
              <span className="text-gray-400">—</span>
              <span>{ROL_LABEL[d.rol] ?? d.rol}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into `RevisionStep.tsx` — "Enviar al Comité" principal (line ~1247)**

Add the import near the other component imports at the top of `RevisionStep.tsx`:

```ts
import { DestinatariosPreview } from "@/app/ui/grd/incidente/components/DestinatariosPreview";
```

Find the block (around line 1247) with `!informeYaEnviado && (<button ... Enviar al Comité .../>)` that is outside the PDF flow and wrap it:

```tsx
) : (
  !informeYaEnviado && (
    <div className="space-y-2">
      <DestinatariosPreview step="informe" incidenciaId={data.idIncidencia} />
      <button
        type="button"
        onClick={handleClickEnviar}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--caritas-green)" }}
      >
        <Send className="w-4 h-4" />
        Enviar al Comité
      </button>
    </div>
  )
)
```

- [ ] **Step 3: Integrate into `RevisionStep.tsx` — "Confirmar y enviar al Comité" (line ~1666)**

Find the confirmation dialog button (last occurrence of `handleClickEnviar`, around line 1666) and wrap the two buttons in the dialog with a `DestinatariosPreview` above:

```tsx
<div className="flex gap-3 pt-2">
  {/* ... Cancelar button ... */}
  {/* ... Confirmar button ... */}
</div>
```

Becomes:

```tsx
<div className="space-y-2 pt-2">
  <DestinatariosPreview step="informe" incidenciaId={data.idIncidencia} />
  <div className="flex gap-3">
    {/* ... Cancelar button (unchanged) ... */}
    {/* ... Confirmar button (unchanged) ... */}
  </div>
</div>
```

- [ ] **Step 4: Integrate into `donaciones-module.tsx` — detail panel Votar button**

Add the import at the top of `donaciones-module.tsx`:

```ts
import { DestinatariosPreview } from "@/app/ui/grd/incidente/components/DestinatariosPreview";
```

Find the second occurrence of `{puedeVotar && (` (around line 526, inside the detail card header `div.flex.items-center.gap-1.5.shrink-0`). Replace just the `puedeVotar` button with a flex column that includes the preview:

```tsx
{puedeVotar && (
  <div className="flex flex-col items-end gap-1">
    <DestinatariosPreview step="decision" incidenciaId={current.id} />
    <button
      onClick={() => setShowVotacion(true)}
      className="flex items-center gap-1.5 text-[var(--caritas-green)] text-sm font-medium px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[var(--caritas-green)]/40 hover:bg-[var(--caritas-green)]/5 transition-all cursor-pointer"
    >
      <Hand className="w-4 h-4" />
      <span>Votar</span>
    </button>
  </div>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

---

### Task 5: `NotificacionesHistorial` component + ResumenStep integration

**Files:**
- Create: `app/ui/grd/incidente/components/NotificacionesHistorial.tsx`
- Modify: `app/ui/grd/incidente/steps/ResumenStep.tsx`

**Interfaces:**
- Consumes: `GET /api/notificaciones/incidencia/:id` (Task 3) returning `NotifHistorialGroup[]`.
- Produces: `<NotificacionesHistorial incidenciaId={string} />` — renders nothing if no notifications exist.

- [ ] **Step 1: Create `NotificacionesHistorial`**

Create `app/ui/grd/incidente/components/NotificacionesHistorial.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { ResumenBloque } from "@/app/ui/grd/incidente/components/ResumenBloque";

const TIPO_LABEL: Record<string, string> = {
  INCIDENCIA_NUEVA: "Nueva incidencia registrada",
  RESPONSABLE_ASIGNADO: "Responsable de equipo asignado",
  BRIGADISTA_ASIGNADO: "Brigadistas asignados",
  INFORME_ENVIADO_COMITE: "Informe enviado al Comité",
  DECISION_APROBADO: "Decisión del Comité: Aprobado",
  DECISION_OBSERVADO: "Decisión del Comité: Observado",
  DECISION_RECHAZADO: "Decisión del Comité: Rechazado",
};

type Destinatario = { nombre: string; email: string; rol: string };

type Group = {
  tipo: string;
  titulo: string;
  enviadoAt: string;
  destinatarios: Destinatario[];
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  incidenciaId: string;
}

export function NotificacionesHistorial({ incidenciaId }: Props) {
  const [grupos, setGrupos] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notificaciones/incidencia/${incidenciaId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setGrupos)
      .catch(() => setGrupos([]))
      .finally(() => setLoading(false));
  }, [incidenciaId]);

  if (loading || grupos.length === 0) return null;

  return (
    <ResumenBloque icon={Bell} titulo="11. Notificaciones enviadas">
      <div className="space-y-3">
        {grupos.map((g) => (
          <div key={g.tipo} className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">
                {TIPO_LABEL[g.tipo] ?? g.titulo}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400 shrink-0">{fmtDateTime(g.enviadoAt)}</span>
            </div>
            <ul className="pl-3 space-y-0.5">
              {g.destinatarios.map((d) => (
                <li key={d.email} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="text-gray-300">└</span>
                  <span>{d.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ResumenBloque>
  );
}
```

- [ ] **Step 2: Add to `ResumenStep.tsx`**

Add the import near line 18 (with the other component imports):

```ts
import { NotificacionesHistorial } from "@/app/ui/grd/incidente/components/NotificacionesHistorial";
```

Then, after the closing `)}` of the "10. Historial de estados" block (around line 480), and before the closing `</div>` and `}` of the component, add:

```tsx
      {/* 11. Notificaciones enviadas */}
      <NotificacionesHistorial incidenciaId={data.idIncidencia} />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass (7 new tests + all pre-existing).
