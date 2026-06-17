# Aprobación de donaciones por quórum del Comité — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la decisión unipersonal del Comité de Donaciones por una votación con quórum `min(4, mayoría)` de los miembros activos con rol `COMITEDONACIONES`.

**Architecture:** Se añaden dos tablas (`RondaVotacionComite`, `VotoComiteDonaciones`) y tres casos de uso nuevos (`AbrirRondaVotacionUseCase`, `RegistrarVotoComiteUseCase`, `ObservarCasoComiteUseCase`). La máquina de estados de `Incidencia` no cambia; lo que cambia es **cuándo** se invoca `aprobar()/rechazar()/observar()`: ahora desde el cierre de una ronda, no desde un clic individual. La UI pasa de "un botón" a "panel de votación con tally en vivo".

**Tech Stack:** Next.js 15 (App Router, Server Actions), Prisma (PostgreSQL), Vitest, React, TypeScript, Tailwind, sonner para toasts.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-06-16-quorum-comite-donaciones-design.md`.
- Umbral: `U = Math.min(4, Math.floor(N/2) + 1)`. N = `User.count({ role: 'COMITEDONACIONES', estado: 'ACTIVO' })`.
- Sin plazo de votación.
- Solo `COMITEDONACIONES` activo puede votar u observar. Validado dentro del use case, no solo en UI.
- Aprobación y rechazo automático al alcanzar el cierre se ejecutan en una transacción Prisma que también cierra la ronda y persiste `nSnapshot`/`umbralSnapshot`.
- Los votos son por ronda; reapertura crea ronda nueva con `numeroRonda + 1`; votos antiguos NO cuentan.
- Cambio de voto permitido mientras la ronda esté abierta (`upsert` por `(idRonda, idUsuarioGRD)`).
- Notificaciones (`notificarDecisionComite`) solo al **cerrar** la ronda, no por cada voto.
- Tests con `vitest`; convención existente: `describe("ClassName — ESCENARIO")`, `it("[positivo|negativo] ...")` (ver `tests/unit/incidencias/DecisionComite.usecase.test.ts`).
- Imports usan alias `@/` (ver `tsconfig.json`).

---

## File Structure

**Crear:**
- `core/domain/entities/comite-donaciones/RondaVotacion.ts`
- `core/domain/entities/comite-donaciones/VotoComite.ts`
- `core/domain/repositories/IComiteDonacionesRepository.ts`
- `core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase.ts`
- `core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase.ts`
- `core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase.ts`
- `core/application/use-cases/comite-donaciones/calcularQuorum.ts`
- `core/infrastructure/database/PrismaComiteDonacionesRepository.ts`
- `core/infrastructure/factories/makeComiteDonacionesUseCases.ts`
- `app/actions/comite-donaciones.ts`
- `app/lib/comite-donaciones-tally.ts`
- `app/ui/donaciones/PanelVotacionComite.tsx`
- `prisma/backfill-rondas-en-evaluacion.ts`
- `tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts`
- `tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts`
- `tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts`
- `tests/unit/comite-donaciones/calcularQuorum.test.ts`

**Modificar:**
- `prisma/schema.prisma` — añadir modelos `RondaVotacionComite`, `VotoComiteDonaciones`, relaciones desde `Incidencia` y `UsuarioGRD`.
- `core/application/use-cases/incidencias/FlujoCampo.usecase.ts` — `GenerarInformeEvaluacionUseCase` y `CorregirYReenviarUseCase` invocan `AbrirRondaVotacionUseCase` al pasar a `EN EVALUACION`.
- `core/infrastructure/factories/makeIncidenciaUseCases.ts` — inyectar el repo del comité a los use cases del flujo para que abran ronda.
- `app/actions/incidents.ts` — eliminar `aprobarCaso`/`rechazarCaso`; reemplazar `observarCaso` para usar el nuevo use case; mover `notificarDecisionComite` para que se dispare solo al cerrar la ronda.
- `app/ui/donaciones/donaciones-module.tsx` — sustituir botones individuales por `<PanelVotacionComite>` y exponer la sesión + tally.
- `app/ui/donaciones/DonacionesModule.tsx` — eliminar `handleAprobar`/`handleObservar`/`handleRechazar` y mostrar el panel de votación equivalente.
- `app/(protected)/donaciones/page.tsx` — pasar `idUsuarioGRD`, rol, y carga del tally al componente.

**Eliminar:**
- `core/application/use-cases/incidencias/DecisionComite.usecase.ts`.
- `tests/unit/incidencias/DecisionComite.usecase.test.ts`.

---

### Task 1: Esquema Prisma y migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_comite_donaciones_quorum/migration.sql` (generado por `prisma migrate dev`)

**Interfaces:**
- Produces: tablas `RondaVotacionComite` y `VotoComiteDonaciones` con relaciones a `Incidencia.idIncidencia` y `UsuarioGRD.idUsuarioGRD`.

- [ ] **Step 1: Añadir el enum y los dos modelos a `prisma/schema.prisma` justo después de `model EntregaAyudaHumanitaria`**

Agregar al final de la sección del DER (después del bloque de entregas):

```prisma
enum EstadoRondaVotacionComite {
  ABIERTA
  CERRADA_APROBADA
  CERRADA_RECHAZADA
  CERRADA_OBSERVADA
}

enum DecisionVotoComite {
  A_FAVOR
  EN_CONTRA
}

model RondaVotacionComite {
  idRonda          String                     @id @default(uuid())
  idIncidencia     String
  numeroRonda      Int
  estado           EstadoRondaVotacionComite  @default(ABIERTA)
  nSnapshot        Int?
  umbralSnapshot   Int?
  abiertaAt        DateTime                   @default(now())
  cerradaAt        DateTime?
  idUsuarioCierre  String?
  observaciones    String?
  createdAt        DateTime                   @default(now())
  updatedAt        DateTime                   @updatedAt

  incidencia       Incidencia                 @relation(fields: [idIncidencia], references: [idIncidencia])
  usuarioCierre    UsuarioGRD?                @relation("RondaCierre", fields: [idUsuarioCierre], references: [idUsuarioGRD])
  votos            VotoComiteDonaciones[]

  @@unique([idIncidencia, numeroRonda], map: "uq_ronda_incidencia_numero")
  @@index([idIncidencia, estado], map: "idx_ronda_incidencia_estado")
  @@map("ronda_votacion_comite")
}

model VotoComiteDonaciones {
  idVoto        String              @id @default(uuid())
  idRonda       String
  idUsuarioGRD  String
  decision      DecisionVotoComite
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  ronda         RondaVotacionComite @relation(fields: [idRonda], references: [idRonda], onDelete: Cascade)
  usuario       UsuarioGRD          @relation("VotoComite", fields: [idUsuarioGRD], references: [idUsuarioGRD])

  @@unique([idRonda, idUsuarioGRD], map: "uq_voto_ronda_usuario")
  @@index([idRonda, decision], map: "idx_voto_ronda_decision")
  @@map("voto_comite_donaciones")
}
```

- [ ] **Step 2: Añadir las relaciones inversas en `Incidencia` y `UsuarioGRD`**

En `model Incidencia` (donde están las otras relaciones, junto a `solicitudesAyuda`):

```prisma
  rondasVotacionComite RondaVotacionComite[]
```

En `model UsuarioGRD` (donde están sus colecciones existentes), añadir:

```prisma
  votosComite          VotoComiteDonaciones[]  @relation("VotoComite")
  rondasCerradas       RondaVotacionComite[]   @relation("RondaCierre")
```

- [ ] **Step 3: Generar y aplicar la migración**

Run:

```bash
npx prisma migrate dev --name comite_donaciones_quorum
```

Expected: crea `prisma/migrations/<timestamp>_comite_donaciones_quorum/migration.sql` con `CREATE TABLE ronda_votacion_comite`, `CREATE TABLE voto_comite_donaciones` y los índices/uniques; `prisma generate` se ejecuta automáticamente sin error.

- [ ] **Step 4: Verificar tipos generados**

Run:

```bash
npx tsc --noEmit
```

Expected: 0 errores. (Los errores que vengan de archivos aún no modificados los corregimos en sus respectivas tareas.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(donaciones): schema rondas y votos del comité"
```

---

### Task 2: Función pura `calcularQuorum` con tests

**Files:**
- Create: `core/application/use-cases/comite-donaciones/calcularQuorum.ts`
- Test: `tests/unit/comite-donaciones/calcularQuorum.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type EstadoQuorum =
    | { tipo: "EN_CURSO" }
    | { tipo: "APROBAR" }
    | { tipo: "RECHAZAR" };

  export function calcularUmbral(n: number): number; // = min(4, floor(n/2)+1) si n>=1, si n=0 lanza Error
  export function evaluarQuorum(
    n: number,
    aFavor: number,
    enContra: number
  ): EstadoQuorum;
  ```

- [ ] **Step 1: Escribir tests fallando**

Crear `tests/unit/comite-donaciones/calcularQuorum.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  calcularUmbral,
  evaluarQuorum,
} from "@/core/application/use-cases/comite-donaciones/calcularQuorum";

describe("calcularUmbral", () => {
  it("[positivo] N=1 → 1", () => expect(calcularUmbral(1)).toBe(1));
  it("[positivo] N=3 → 2", () => expect(calcularUmbral(3)).toBe(2));
  it("[positivo] N=5 → 3", () => expect(calcularUmbral(5)).toBe(3));
  it("[positivo] N=7 → 4 (mayoría)", () => expect(calcularUmbral(7)).toBe(4));
  it("[positivo] N=8 → 4 (tope 4)", () => expect(calcularUmbral(8)).toBe(4));
  it("[positivo] N=10 → 4 (tope 4)", () => expect(calcularUmbral(10)).toBe(4));
  it("[negativo] N=0 lanza Error", () =>
    expect(() => calcularUmbral(0)).toThrow(/sin miembros activos/i));
});

describe("evaluarQuorum", () => {
  it("[positivo] EN_CURSO cuando ni a favor ni contra alcanzan corte", () => {
    expect(evaluarQuorum(10, 2, 2)).toEqual({ tipo: "EN_CURSO" });
  });
  it("[positivo] APROBAR cuando aFavor alcanza umbral (N=10, U=4)", () => {
    expect(evaluarQuorum(10, 4, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] RECHAZAR cuando enContra hace imposible el umbral (N=10, U=4, contra>6)", () => {
    expect(evaluarQuorum(10, 0, 7)).toEqual({ tipo: "RECHAZAR" });
  });
  it("[positivo] N=5 aprueba con 3 a favor (mayoría < 4)", () => {
    expect(evaluarQuorum(5, 3, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] N=5 rechaza con 3 en contra (queda < umbral alcanzable)", () => {
    expect(evaluarQuorum(5, 0, 3)).toEqual({ tipo: "RECHAZAR" });
  });
});
```

- [ ] **Step 2: Ejecutar tests para ver que fallan**

Run: `npx vitest run tests/unit/comite-donaciones/calcularQuorum.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar el módulo**

Crear `core/application/use-cases/comite-donaciones/calcularQuorum.ts`:

```ts
export type EstadoQuorum =
  | { tipo: "EN_CURSO" }
  | { tipo: "APROBAR" }
  | { tipo: "RECHAZAR" };

const TOPE_QUORUM = 4;

export function calcularUmbral(n: number): number {
  if (n < 1) {
    throw new Error("Comité sin miembros activos: no se puede calcular umbral.");
  }
  const mayoria = Math.floor(n / 2) + 1;
  return Math.min(TOPE_QUORUM, mayoria);
}

export function evaluarQuorum(
  n: number,
  aFavor: number,
  enContra: number
): EstadoQuorum {
  const u = calcularUmbral(n);
  if (aFavor >= u) return { tipo: "APROBAR" };
  if (enContra > n - u) return { tipo: "RECHAZAR" };
  return { tipo: "EN_CURSO" };
}
```

- [ ] **Step 4: Re-ejecutar tests**

Run: `npx vitest run tests/unit/comite-donaciones/calcularQuorum.test.ts`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add core/application/use-cases/comite-donaciones/calcularQuorum.ts \
        tests/unit/comite-donaciones/calcularQuorum.test.ts
git commit -m "feat(donaciones): calcular quorum del comité"
```

---

### Task 3: Entidades de dominio y contrato del repositorio del comité

**Files:**
- Create: `core/domain/entities/comite-donaciones/RondaVotacion.ts`
- Create: `core/domain/entities/comite-donaciones/VotoComite.ts`
- Create: `core/domain/repositories/IComiteDonacionesRepository.ts`

**Interfaces:**
- Produces:
  ```ts
  export type EstadoRonda =
    | "ABIERTA"
    | "CERRADA_APROBADA"
    | "CERRADA_RECHAZADA"
    | "CERRADA_OBSERVADA";

  export type DecisionVoto = "A_FAVOR" | "EN_CONTRA";

  export interface RondaVotacion {
    idRonda: string;
    idIncidencia: string;
    numeroRonda: number;
    estado: EstadoRonda;
  }

  export interface VotoComite {
    idVoto: string;
    idRonda: string;
    idUsuarioGRD: string;
    decision: DecisionVoto;
  }

  export interface CierreRonda {
    estado: Exclude<EstadoRonda, "ABIERTA">;
    nSnapshot: number;
    umbralSnapshot: number;
    idUsuarioCierre?: string;
    observaciones?: string;
  }

  export interface TallyRonda {
    n: number;
    umbral: number;
    aFavor: number;
    enContra: number;
    pendientes: number;
    votos: Array<{ idUsuarioGRD: string; decision: DecisionVoto; fecha: Date }>;
  }

  export interface IComiteDonacionesRepository {
    findRondaAbierta(idIncidencia: string): Promise<RondaVotacion | null>;
    abrirRonda(idIncidencia: string): Promise<RondaVotacion>;
    upsertVoto(idRonda: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<void>;
    contarMiembrosActivos(): Promise<number>;
    esMiembroActivo(idUsuarioGRD: string): Promise<boolean>;
    contarVotos(idRonda: string): Promise<{ aFavor: number; enContra: number }>;
    cerrarRonda(idRonda: string, cierre: CierreRonda): Promise<void>;
    tally(idIncidencia: string): Promise<TallyRonda | null>;
  }
  ```

- [ ] **Step 1: Crear los tipos de la ronda**

Crear `core/domain/entities/comite-donaciones/RondaVotacion.ts`:

```ts
export type EstadoRonda =
  | "ABIERTA"
  | "CERRADA_APROBADA"
  | "CERRADA_RECHAZADA"
  | "CERRADA_OBSERVADA";

export interface RondaVotacion {
  idRonda: string;
  idIncidencia: string;
  numeroRonda: number;
  estado: EstadoRonda;
}

export interface CierreRonda {
  estado: Exclude<EstadoRonda, "ABIERTA">;
  nSnapshot: number;
  umbralSnapshot: number;
  idUsuarioCierre?: string;
  observaciones?: string;
}
```

- [ ] **Step 2: Crear los tipos del voto**

Crear `core/domain/entities/comite-donaciones/VotoComite.ts`:

```ts
export type DecisionVoto = "A_FAVOR" | "EN_CONTRA";

export interface VotoComite {
  idVoto: string;
  idRonda: string;
  idUsuarioGRD: string;
  decision: DecisionVoto;
}

export interface TallyRonda {
  n: number;
  umbral: number;
  aFavor: number;
  enContra: number;
  pendientes: number;
  votos: Array<{ idUsuarioGRD: string; decision: DecisionVoto; fecha: Date }>;
}
```

- [ ] **Step 3: Crear el contrato del repositorio**

Crear `core/domain/repositories/IComiteDonacionesRepository.ts`:

```ts
import { RondaVotacion, CierreRonda } from "../entities/comite-donaciones/RondaVotacion";
import { DecisionVoto, TallyRonda } from "../entities/comite-donaciones/VotoComite";

export interface IComiteDonacionesRepository {
  /** Devuelve la ronda ABIERTA de la incidencia o null. */
  findRondaAbierta(idIncidencia: string): Promise<RondaVotacion | null>;

  /** Crea una nueva ronda con numeroRonda = max + 1. */
  abrirRonda(idIncidencia: string): Promise<RondaVotacion>;

  /** Inserta o actualiza el voto del miembro en la ronda. */
  upsertVoto(idRonda: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<void>;

  /** Cuenta usuarios con User.role = COMITEDONACIONES y estado = ACTIVO. */
  contarMiembrosActivos(): Promise<number>;

  /** Valida que el UsuarioGRD pertenezca a un User activo con rol COMITEDONACIONES. */
  esMiembroActivo(idUsuarioGRD: string): Promise<boolean>;

  /** Suma A_FAVOR / EN_CONTRA de los votos de la ronda. */
  contarVotos(idRonda: string): Promise<{ aFavor: number; enContra: number }>;

  /** Cierra la ronda con snapshot y, si aplica, observaciones y usuario que cerró. */
  cerrarRonda(idRonda: string, cierre: CierreRonda): Promise<void>;

  /** Devuelve el tally completo de la ronda abierta (null si no hay ninguna). */
  tally(idIncidencia: string): Promise<TallyRonda | null>;
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: 0 errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add core/domain/entities/comite-donaciones core/domain/repositories/IComiteDonacionesRepository.ts
git commit -m "feat(donaciones): contrato del repo del comité"
```

---

### Task 4: `AbrirRondaVotacionUseCase` con tests

**Files:**
- Create: `core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase.ts`
- Test: `tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts`

**Interfaces:**
- Consumes: `IComiteDonacionesRepository.findRondaAbierta`, `abrirRonda`.
- Produces:
  ```ts
  export class AbrirRondaVotacionUseCase {
    constructor(private readonly repo: IComiteDonacionesRepository) {}
    /** Idempotente: si ya hay ronda abierta, la devuelve. */
    execute(idIncidencia: string): Promise<RondaVotacion>;
  }
  ```

- [ ] **Step 1: Escribir el test fallando**

Crear `tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { AbrirRondaVotacionUseCase } from "@/core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";

function repoMock(over: Partial<IComiteDonacionesRepository> = {}): IComiteDonacionesRepository {
  return {
    findRondaAbierta: vi.fn().mockResolvedValue(null),
    abrirRonda: vi.fn().mockResolvedValue({
      idRonda: "r-1",
      idIncidencia: "inc-1",
      numeroRonda: 1,
      estado: "ABIERTA",
    }),
    upsertVoto: vi.fn(),
    contarMiembrosActivos: vi.fn(),
    esMiembroActivo: vi.fn(),
    contarVotos: vi.fn(),
    cerrarRonda: vi.fn(),
    tally: vi.fn(),
    ...over,
  };
}

describe("AbrirRondaVotacionUseCase", () => {
  it("[positivo] abre una ronda nueva cuando no existe ninguna abierta", async () => {
    const repo = repoMock();
    const ronda = await new AbrirRondaVotacionUseCase(repo).execute("inc-1");
    expect(repo.abrirRonda).toHaveBeenCalledWith("inc-1");
    expect(ronda.estado).toBe("ABIERTA");
  });

  it("[positivo] es idempotente: devuelve la ronda abierta existente sin crear otra", async () => {
    const existente = { idRonda: "r-0", idIncidencia: "inc-1", numeroRonda: 1, estado: "ABIERTA" as const };
    const repo = repoMock({ findRondaAbierta: vi.fn().mockResolvedValue(existente) });
    const ronda = await new AbrirRondaVotacionUseCase(repo).execute("inc-1");
    expect(repo.abrirRonda).not.toHaveBeenCalled();
    expect(ronda).toEqual(existente);
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npx vitest run tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar el use case**

Crear `core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase.ts`:

```ts
import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion } from "../../../domain/entities/comite-donaciones/RondaVotacion";

/**
 * Abre la ronda de votación del Comité para una incidencia que entra a EN EVALUACION.
 * Idempotente: si ya existe una ronda ABIERTA, la devuelve sin crear otra.
 */
export class AbrirRondaVotacionUseCase {
  constructor(private readonly repo: IComiteDonacionesRepository) {}

  async execute(idIncidencia: string): Promise<RondaVotacion> {
    const abierta = await this.repo.findRondaAbierta(idIncidencia);
    if (abierta) return abierta;
    return this.repo.abrirRonda(idIncidencia);
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase.ts \
        tests/unit/comite-donaciones/AbrirRondaVotacion.usecase.test.ts
git commit -m "feat(donaciones): use case abrir ronda de votación"
```

---

### Task 5: `RegistrarVotoComiteUseCase` con tests

**Files:**
- Create: `core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase.ts`
- Test: `tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts`

**Interfaces:**
- Consumes: `IComiteDonacionesRepository`, `IIncidenciaRepository.findById` y `guardarTransicion`, `evaluarQuorum`, `calcularUmbral`.
- Produces:
  ```ts
  export type ResultadoVoto =
    | { estado: "EN_CURSO"; tally: TallyRonda }
    | { estado: "APROBADA"; tally: TallyRonda }
    | { estado: "RECHAZADA"; tally: TallyRonda };

  export class RegistrarVotoComiteUseCase {
    constructor(
      private readonly comite: IComiteDonacionesRepository,
      private readonly incidencias: IIncidenciaRepository
    ) {}
    execute(idIncidencia: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<ResultadoVoto>;
  }
  ```

- [ ] **Step 1: Escribir el test fallando**

Crear `tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { RegistrarVotoComiteUseCase } from "@/core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { BusinessRuleError, NotFoundError } from "@/core/domain/errors/DomainError";

function incRepoMock(inc: Incidencia | null = null): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn(),
    crear: vi.fn(),
    findById: vi.fn().mockResolvedValue(inc),
    actualizarDatos: vi.fn(),
    guardarTransicion: vi.fn().mockResolvedValue(undefined),
    registrarAsignacion: vi.fn(),
    asignarEquipo: vi.fn(),
    asignarResponsable: vi.fn(),
    guardarInforme: vi.fn(),
    upsertSolicitudEnEvaluacion: vi.fn(),
    resolverSolicitud: vi.fn().mockResolvedValue(undefined),
    registrarEntrega: vi.fn(),
    agregarSeguimiento: vi.fn(),
    liberarBrigadistas: vi.fn(),
    agregarPersona: vi.fn(),
    guardarEvidencias: vi.fn(),
  } as IIncidenciaRepository;
}

function comiteMock(over: Partial<IComiteDonacionesRepository> = {}): IComiteDonacionesRepository {
  return {
    findRondaAbierta: vi.fn().mockResolvedValue({
      idRonda: "r-1",
      idIncidencia: "inc-1",
      numeroRonda: 1,
      estado: "ABIERTA",
    }),
    abrirRonda: vi.fn(),
    upsertVoto: vi.fn().mockResolvedValue(undefined),
    contarMiembrosActivos: vi.fn().mockResolvedValue(10),
    esMiembroActivo: vi.fn().mockResolvedValue(true),
    contarVotos: vi.fn().mockResolvedValue({ aFavor: 0, enContra: 0 }),
    cerrarRonda: vi.fn().mockResolvedValue(undefined),
    tally: vi.fn().mockResolvedValue({ n: 10, umbral: 4, aFavor: 0, enContra: 0, pendientes: 10, votos: [] }),
    ...over,
  };
}

function inc(estado: "EN EVALUACION" = "EN EVALUACION") {
  return Incidencia.desdePersistencia({ id: "inc-1", estadoActual: estado });
}

describe("RegistrarVotoComiteUseCase — flujo en curso", () => {
  it("[positivo] registra el voto y deja la ronda abierta", async () => {
    const inci = inc();
    const comite = comiteMock({
      contarVotos: vi.fn().mockResolvedValue({ aFavor: 2, enContra: 1 }),
      tally: vi.fn().mockResolvedValue({ n: 10, umbral: 4, aFavor: 2, enContra: 1, pendientes: 7, votos: [] }),
    });
    const incRepo = incRepoMock(inci);

    const res = await new RegistrarVotoComiteUseCase(comite, incRepo).execute(
      "inc-1",
      "u-1",
      "A_FAVOR"
    );

    expect(comite.upsertVoto).toHaveBeenCalledWith("r-1", "u-1", "A_FAVOR");
    expect(res.estado).toBe("EN_CURSO");
    expect(comite.cerrarRonda).not.toHaveBeenCalled();
    expect(incRepo.guardarTransicion).not.toHaveBeenCalled();
  });
});

describe("RegistrarVotoComiteUseCase — cierre APROBADA", () => {
  it("[positivo] alcanza umbral y aprueba la incidencia", async () => {
    const inci = inc();
    const comite = comiteMock({
      contarVotos: vi.fn().mockResolvedValue({ aFavor: 4, enContra: 0 }),
      tally: vi.fn().mockResolvedValue({ n: 10, umbral: 4, aFavor: 4, enContra: 0, pendientes: 6, votos: [] }),
    });
    const incRepo = incRepoMock(inci);

    const res = await new RegistrarVotoComiteUseCase(comite, incRepo).execute(
      "inc-1",
      "u-1",
      "A_FAVOR"
    );

    expect(res.estado).toBe("APROBADA");
    expect(comite.cerrarRonda).toHaveBeenCalledWith("r-1", {
      estado: "CERRADA_APROBADA",
      nSnapshot: 10,
      umbralSnapshot: 4,
    });
    expect(inci.estadoActual).toBe("APROBADO");
    expect(incRepo.guardarTransicion).toHaveBeenCalled();
    expect(incRepo.resolverSolicitud).toHaveBeenCalledWith("inc-1", "APROBADA");
  });
});

describe("RegistrarVotoComiteUseCase — cierre RECHAZADA", () => {
  it("[positivo] rechazo automático cuando los contras superan N-U", async () => {
    const inci = inc();
    const comite = comiteMock({
      contarVotos: vi.fn().mockResolvedValue({ aFavor: 0, enContra: 7 }),
      tally: vi.fn().mockResolvedValue({ n: 10, umbral: 4, aFavor: 0, enContra: 7, pendientes: 3, votos: [] }),
    });
    const incRepo = incRepoMock(inci);

    const res = await new RegistrarVotoComiteUseCase(comite, incRepo).execute(
      "inc-1",
      "u-2",
      "EN_CONTRA"
    );

    expect(res.estado).toBe("RECHAZADA");
    expect(comite.cerrarRonda).toHaveBeenCalledWith("r-1", {
      estado: "CERRADA_RECHAZADA",
      nSnapshot: 10,
      umbralSnapshot: 4,
    });
    expect(inci.estadoActual).toBe("RECHAZADO");
    expect(incRepo.resolverSolicitud).toHaveBeenCalledWith("inc-1", "RECHAZADA");
  });
});

describe("RegistrarVotoComiteUseCase — errores", () => {
  it("[negativo] error si la incidencia no existe", async () => {
    const comite = comiteMock();
    const incRepo = incRepoMock(null);
    await expect(
      new RegistrarVotoComiteUseCase(comite, incRepo).execute("inc-x", "u-1", "A_FAVOR")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] error si el usuario no es miembro activo", async () => {
    const comite = comiteMock({ esMiembroActivo: vi.fn().mockResolvedValue(false) });
    const incRepo = incRepoMock(inc());
    await expect(
      new RegistrarVotoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "A_FAVOR")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] error si no hay ronda abierta", async () => {
    const comite = comiteMock({ findRondaAbierta: vi.fn().mockResolvedValue(null) });
    const incRepo = incRepoMock(inc());
    await expect(
      new RegistrarVotoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "A_FAVOR")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] error si N=0 (comité vacío)", async () => {
    const comite = comiteMock({ contarMiembrosActivos: vi.fn().mockResolvedValue(0) });
    const incRepo = incRepoMock(inc());
    await expect(
      new RegistrarVotoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "A_FAVOR")
    ).rejects.toThrow(BusinessRuleError);
  });
});
```

- [ ] **Step 2: Ejecutar para que falle**

Run: `npx vitest run tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar el use case**

Crear `core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase.ts`:

```ts
import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { DecisionVoto, TallyRonda } from "../../../domain/entities/comite-donaciones/VotoComite";
import {
  BusinessRuleError,
  NotFoundError,
} from "../../../domain/errors/DomainError";
import { evaluarQuorum, calcularUmbral } from "./calcularQuorum";

export type ResultadoVoto =
  | { estado: "EN_CURSO"; tally: TallyRonda }
  | { estado: "APROBADA"; tally: TallyRonda }
  | { estado: "RECHAZADA"; tally: TallyRonda };

/**
 * Registra el voto de un miembro del Comité y, si corresponde, cierra la ronda
 * transicionando la Incidencia. Cierre por aprobación se da al alcanzar el
 * umbral; rechazo automático cuando los EN_CONTRA imposibilitan llegar a U.
 */
export class RegistrarVotoComiteUseCase {
  constructor(
    private readonly comite: IComiteDonacionesRepository,
    private readonly incidencias: IIncidenciaRepository
  ) {}

  async execute(
    idIncidencia: string,
    idUsuarioGRD: string,
    decision: DecisionVoto
  ): Promise<ResultadoVoto> {
    const inc = await this.incidencias.findById(idIncidencia);
    if (!inc) throw new NotFoundError("Incidencia no encontrada.");

    if (!(await this.comite.esMiembroActivo(idUsuarioGRD))) {
      throw new BusinessRuleError("El usuario no es miembro activo del Comité.");
    }

    const ronda = await this.comite.findRondaAbierta(idIncidencia);
    if (!ronda) {
      throw new BusinessRuleError("No hay ronda de votación abierta para esta incidencia.");
    }

    const n = await this.comite.contarMiembrosActivos();
    if (n < 1) {
      throw new BusinessRuleError("Comité sin miembros activos: no se puede votar.");
    }

    await this.comite.upsertVoto(ronda.idRonda, idUsuarioGRD, decision);

    const { aFavor, enContra } = await this.comite.contarVotos(ronda.idRonda);
    const decisionQuorum = evaluarQuorum(n, aFavor, enContra);
    const umbral = calcularUmbral(n);

    if (decisionQuorum.tipo === "APROBAR") {
      inc.aprobar();
      await this.comite.cerrarRonda(ronda.idRonda, {
        estado: "CERRADA_APROBADA",
        nSnapshot: n,
        umbralSnapshot: umbral,
      });
      await this.incidencias.resolverSolicitud(idIncidencia, "APROBADA");
      await this.incidencias.guardarTransicion(inc, "Caso aprobado por quórum del Comité");
      const tally = (await this.comite.tally(idIncidencia))!;
      return { estado: "APROBADA", tally };
    }

    if (decisionQuorum.tipo === "RECHAZAR") {
      inc.rechazar();
      await this.comite.cerrarRonda(ronda.idRonda, {
        estado: "CERRADA_RECHAZADA",
        nSnapshot: n,
        umbralSnapshot: umbral,
      });
      await this.incidencias.resolverSolicitud(idIncidencia, "RECHAZADA");
      await this.incidencias.guardarTransicion(inc, "Caso rechazado por quórum del Comité");
      const tally = (await this.comite.tally(idIncidencia))!;
      return { estado: "RECHAZADA", tally };
    }

    const tally = (await this.comite.tally(idIncidencia))!;
    return { estado: "EN_CURSO", tally };
  }
}
```

- [ ] **Step 4: Ejecutar tests y verificar PASS**

Run: `npx vitest run tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase.ts \
        tests/unit/comite-donaciones/RegistrarVotoComite.usecase.test.ts
git commit -m "feat(donaciones): use case registrar voto del comité con cierre por quórum"
```

---

### Task 6: `ObservarCasoComiteUseCase` con tests

**Files:**
- Create: `core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase.ts`
- Test: `tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts`

**Interfaces:**
- Consumes: `IComiteDonacionesRepository`, `IIncidenciaRepository`.
- Produces:
  ```ts
  export class ObservarCasoComiteUseCase {
    constructor(
      private readonly comite: IComiteDonacionesRepository,
      private readonly incidencias: IIncidenciaRepository
    ) {}
    execute(idIncidencia: string, idUsuarioGRD: string, observaciones: string): Promise<void>;
  }
  ```

- [ ] **Step 1: Escribir el test fallando**

Crear `tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { ObservarCasoComiteUseCase } from "@/core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { BusinessRuleError, ValidationError, NotFoundError } from "@/core/domain/errors/DomainError";

function incRepoMock(inc: Incidencia | null = null): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn(),
    crear: vi.fn(),
    findById: vi.fn().mockResolvedValue(inc),
    actualizarDatos: vi.fn(),
    guardarTransicion: vi.fn().mockResolvedValue(undefined),
    registrarAsignacion: vi.fn(),
    asignarEquipo: vi.fn(),
    asignarResponsable: vi.fn(),
    guardarInforme: vi.fn(),
    upsertSolicitudEnEvaluacion: vi.fn(),
    resolverSolicitud: vi.fn().mockResolvedValue(undefined),
    registrarEntrega: vi.fn(),
    agregarSeguimiento: vi.fn(),
    liberarBrigadistas: vi.fn(),
    agregarPersona: vi.fn(),
    guardarEvidencias: vi.fn(),
  } as IIncidenciaRepository;
}

function comiteMock(over: Partial<IComiteDonacionesRepository> = {}): IComiteDonacionesRepository {
  return {
    findRondaAbierta: vi.fn().mockResolvedValue({
      idRonda: "r-1",
      idIncidencia: "inc-1",
      numeroRonda: 1,
      estado: "ABIERTA",
    }),
    abrirRonda: vi.fn(),
    upsertVoto: vi.fn(),
    contarMiembrosActivos: vi.fn().mockResolvedValue(5),
    esMiembroActivo: vi.fn().mockResolvedValue(true),
    contarVotos: vi.fn(),
    cerrarRonda: vi.fn().mockResolvedValue(undefined),
    tally: vi.fn(),
    ...over,
  };
}

const inc = () => Incidencia.desdePersistencia({ id: "inc-1", estadoActual: "EN EVALUACION" });

describe("ObservarCasoComiteUseCase", () => {
  it("[positivo] observa el caso y cierra la ronda como CERRADA_OBSERVADA", async () => {
    const inci = inc();
    const comite = comiteMock();
    const incRepo = incRepoMock(inci);

    await new ObservarCasoComiteUseCase(comite, incRepo).execute(
      "inc-1",
      "u-1",
      "Falta documentación del afectado"
    );

    expect(comite.cerrarRonda).toHaveBeenCalledWith("r-1", expect.objectContaining({
      estado: "CERRADA_OBSERVADA",
      idUsuarioCierre: "u-1",
      observaciones: "Falta documentación del afectado",
    }));
    expect(inci.estadoActual).toBe("OBSERVADO");
    expect(incRepo.resolverSolicitud).toHaveBeenCalledWith(
      "inc-1",
      "EN_EVALUACION",
      "Falta documentación del afectado"
    );
  });

  it("[negativo] error si el usuario no es del comité", async () => {
    const comite = comiteMock({ esMiembroActivo: vi.fn().mockResolvedValue(false) });
    const incRepo = incRepoMock(inc());
    await expect(
      new ObservarCasoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "x")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] error si las observaciones están vacías", async () => {
    const comite = comiteMock();
    const incRepo = incRepoMock(inc());
    await expect(
      new ObservarCasoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "   ")
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] error si no hay ronda abierta", async () => {
    const comite = comiteMock({ findRondaAbierta: vi.fn().mockResolvedValue(null) });
    const incRepo = incRepoMock(inc());
    await expect(
      new ObservarCasoComiteUseCase(comite, incRepo).execute("inc-1", "u-1", "obs")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] NotFoundError si la incidencia no existe", async () => {
    const comite = comiteMock();
    const incRepo = incRepoMock(null);
    await expect(
      new ObservarCasoComiteUseCase(comite, incRepo).execute("inc-x", "u-1", "obs")
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Ejecutar para fallar**

Run: `npx vitest run tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar el use case**

Crear `core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase.ts`:

```ts
import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "../../../domain/errors/DomainError";
import { calcularUmbral } from "./calcularQuorum";

/**
 * Cualquier miembro activo del Comité puede observar el caso, devolviéndolo al
 * GRD con un comentario. Cierra la ronda actual como CERRADA_OBSERVADA y
 * transiciona la incidencia a OBSERVADO. Al reabrir, se creará una ronda nueva.
 */
export class ObservarCasoComiteUseCase {
  constructor(
    private readonly comite: IComiteDonacionesRepository,
    private readonly incidencias: IIncidenciaRepository
  ) {}

  async execute(
    idIncidencia: string,
    idUsuarioGRD: string,
    observaciones: string
  ): Promise<void> {
    const inc = await this.incidencias.findById(idIncidencia);
    if (!inc) throw new NotFoundError("Incidencia no encontrada.");

    if (!observaciones?.trim()) {
      throw new ValidationError("Las observaciones son obligatorias para observar el caso.");
    }

    if (!(await this.comite.esMiembroActivo(idUsuarioGRD))) {
      throw new BusinessRuleError("El usuario no es miembro activo del Comité.");
    }

    const ronda = await this.comite.findRondaAbierta(idIncidencia);
    if (!ronda) {
      throw new BusinessRuleError("No hay ronda de votación abierta para observar.");
    }

    const n = await this.comite.contarMiembrosActivos();
    const umbral = n > 0 ? calcularUmbral(n) : 0;

    inc.observar();
    await this.comite.cerrarRonda(ronda.idRonda, {
      estado: "CERRADA_OBSERVADA",
      nSnapshot: n,
      umbralSnapshot: umbral,
      idUsuarioCierre: idUsuarioGRD,
      observaciones: observaciones.trim(),
    });
    await this.incidencias.resolverSolicitud(idIncidencia, "EN_EVALUACION", observaciones.trim());
    await this.incidencias.guardarTransicion(inc, "Caso devuelto con observaciones por el Comité", observaciones.trim());
  }
}
```

- [ ] **Step 4: Ejecutar tests y verificar PASS**

Run: `npx vitest run tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase.ts \
        tests/unit/comite-donaciones/ObservarCasoComite.usecase.test.ts
git commit -m "feat(donaciones): use case observar caso por el comité"
```

---

### Task 7: Implementación Prisma del repositorio del Comité

**Files:**
- Create: `core/infrastructure/database/PrismaComiteDonacionesRepository.ts`

**Interfaces:**
- Consumes: `prisma` (global), `IComiteDonacionesRepository`.
- Produces: implementación inyectable en use cases y factory.

- [ ] **Step 1: Crear la implementación**

Crear `core/infrastructure/database/PrismaComiteDonacionesRepository.ts`:

```ts
import { prisma } from "@/app/lib/prisma";
import { IComiteDonacionesRepository } from "../../domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion, CierreRonda } from "../../domain/entities/comite-donaciones/RondaVotacion";
import { DecisionVoto, TallyRonda } from "../../domain/entities/comite-donaciones/VotoComite";

const ROL_COMITE = "COMITEDONACIONES";

export class PrismaComiteDonacionesRepository implements IComiteDonacionesRepository {
  async findRondaAbierta(idIncidencia: string): Promise<RondaVotacion | null> {
    const r = await prisma.rondaVotacionComite.findFirst({
      where: { idIncidencia, estado: "ABIERTA" },
      select: { idRonda: true, idIncidencia: true, numeroRonda: true, estado: true },
    });
    return r ? { ...r } : null;
  }

  async abrirRonda(idIncidencia: string): Promise<RondaVotacion> {
    return prisma.$transaction(async (tx) => {
      const max = await tx.rondaVotacionComite.aggregate({
        where: { idIncidencia },
        _max: { numeroRonda: true },
      });
      const numeroRonda = (max._max.numeroRonda ?? 0) + 1;
      const creada = await tx.rondaVotacionComite.create({
        data: { idIncidencia, numeroRonda, estado: "ABIERTA" },
        select: { idRonda: true, idIncidencia: true, numeroRonda: true, estado: true },
      });
      return creada;
    });
  }

  async upsertVoto(idRonda: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<void> {
    await prisma.votoComiteDonaciones.upsert({
      where: { idRonda_idUsuarioGRD: { idRonda, idUsuarioGRD } },
      create: { idRonda, idUsuarioGRD, decision },
      update: { decision },
    });
  }

  async contarMiembrosActivos(): Promise<number> {
    return prisma.user.count({ where: { role: ROL_COMITE, estado: "ACTIVO" } });
  }

  async esMiembroActivo(idUsuarioGRD: string): Promise<boolean> {
    const perfil = await prisma.usuarioGRD.findUnique({
      where: { idUsuarioGRD },
      select: { credencial: { select: { role: true, estado: true } } },
    });
    return perfil?.credencial?.role === ROL_COMITE && perfil.credencial.estado === "ACTIVO";
  }

  async contarVotos(idRonda: string): Promise<{ aFavor: number; enContra: number }> {
    const agg = await prisma.votoComiteDonaciones.groupBy({
      by: ["decision"],
      where: { idRonda },
      _count: { _all: true },
    });
    let aFavor = 0;
    let enContra = 0;
    for (const row of agg) {
      if (row.decision === "A_FAVOR") aFavor = row._count._all;
      else if (row.decision === "EN_CONTRA") enContra = row._count._all;
    }
    return { aFavor, enContra };
  }

  async cerrarRonda(idRonda: string, cierre: CierreRonda): Promise<void> {
    await prisma.rondaVotacionComite.update({
      where: { idRonda, estado: "ABIERTA" },
      data: {
        estado: cierre.estado,
        nSnapshot: cierre.nSnapshot,
        umbralSnapshot: cierre.umbralSnapshot,
        idUsuarioCierre: cierre.idUsuarioCierre ?? null,
        observaciones: cierre.observaciones ?? null,
        cerradaAt: new Date(),
      },
    });
  }

  async tally(idIncidencia: string): Promise<TallyRonda | null> {
    const ronda = await prisma.rondaVotacionComite.findFirst({
      where: { idIncidencia, estado: "ABIERTA" },
      select: { idRonda: true },
    });
    if (!ronda) return null;

    const [n, votos] = await Promise.all([
      this.contarMiembrosActivos(),
      prisma.votoComiteDonaciones.findMany({
        where: { idRonda: ronda.idRonda },
        select: { idUsuarioGRD: true, decision: true, updatedAt: true },
      }),
    ]);

    const aFavor = votos.filter((v) => v.decision === "A_FAVOR").length;
    const enContra = votos.filter((v) => v.decision === "EN_CONTRA").length;
    const umbral = n > 0 ? Math.min(4, Math.floor(n / 2) + 1) : 0;
    const pendientes = Math.max(0, n - aFavor - enContra);

    return {
      n,
      umbral,
      aFavor,
      enContra,
      pendientes,
      votos: votos.map((v) => ({
        idUsuarioGRD: v.idUsuarioGRD,
        decision: v.decision as DecisionVoto,
        fecha: v.updatedAt,
      })),
    };
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: 0 errores en este archivo (los errores externos sobre `DecisionComiteUseCase` se eliminarán en tareas posteriores).

- [ ] **Step 3: Commit**

```bash
git add core/infrastructure/database/PrismaComiteDonacionesRepository.ts
git commit -m "feat(donaciones): repo Prisma del comité"
```

---

### Task 8: Factory + integración con `FlujoCampo`

**Files:**
- Create: `core/infrastructure/factories/makeComiteDonacionesUseCases.ts`
- Modify: `core/application/use-cases/incidencias/FlujoCampo.usecase.ts`
- Modify: `core/infrastructure/factories/makeIncidenciaUseCases.ts`

**Interfaces:**
- Produces:
  ```ts
  export function makeComiteDonacionesUseCases(): {
    abrirRonda: AbrirRondaVotacionUseCase;
    registrarVoto: RegistrarVotoComiteUseCase;
    observarCaso: ObservarCasoComiteUseCase;
    tally: (idIncidencia: string) => Promise<TallyRonda | null>;
  };
  ```
- `GenerarInformeEvaluacionUseCase` y `CorregirYReenviarUseCase` aceptan un `IComiteDonacionesRepository` opcional y al transicionar a EN EVALUACION llaman `AbrirRondaVotacionUseCase`.

- [ ] **Step 1: Crear la factory**

Crear `core/infrastructure/factories/makeComiteDonacionesUseCases.ts`:

```ts
import { PrismaComiteDonacionesRepository } from "../database/PrismaComiteDonacionesRepository";
import { PrismaIncidenciaRepository } from "../database/PrismaIncidenciaRepository";
import { AbrirRondaVotacionUseCase } from "../../application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { RegistrarVotoComiteUseCase } from "../../application/use-cases/comite-donaciones/RegistrarVotoComite.usecase";
import { ObservarCasoComiteUseCase } from "../../application/use-cases/comite-donaciones/ObservarCasoComite.usecase";

export function makeComiteDonacionesUseCases() {
  const comite = new PrismaComiteDonacionesRepository();
  const incidencias = new PrismaIncidenciaRepository();
  return {
    abrirRonda: new AbrirRondaVotacionUseCase(comite),
    registrarVoto: new RegistrarVotoComiteUseCase(comite, incidencias),
    observarCaso: new ObservarCasoComiteUseCase(comite, incidencias),
    tally: (idIncidencia: string) => comite.tally(idIncidencia),
  };
}
```

- [ ] **Step 2: Inyectar abrir-ronda en `FlujoCampo`**

Editar `core/application/use-cases/incidencias/FlujoCampo.usecase.ts`. Localizar `GenerarInformeEvaluacionUseCase` y `CorregirYReenviarUseCase`. Para ambas, modificar constructor y `execute` así:

```ts
import { AbrirRondaVotacionUseCase } from "../comite-donaciones/AbrirRondaVotacion.usecase";

// dentro de GenerarInformeEvaluacionUseCase:
constructor(
  private readonly repo: IIncidenciaRepository,
  private readonly abrirRonda?: AbrirRondaVotacionUseCase
) {}
// al final del execute, después de upsertSolicitudEnEvaluacion + guardarTransicion:
if (this.abrirRonda) await this.abrirRonda.execute(idIncidencia);

// dentro de CorregirYReenviarUseCase:
constructor(
  private readonly repo: IIncidenciaRepository,
  private readonly abrirRonda?: AbrirRondaVotacionUseCase
) {}
// igual: al final del execute, después de la transición a EN EVALUACION:
if (this.abrirRonda) await this.abrirRonda.execute(idIncidencia);
```

(El parámetro es opcional para no romper los tests existentes que inyectan solo el repo.)

- [ ] **Step 3: Actualizar `makeIncidenciaUseCases` para inyectar `abrirRonda` y reemplazar `decisionComite`**

Reemplazar el contenido relevante de `core/infrastructure/factories/makeIncidenciaUseCases.ts`:

```ts
import { PrismaIncidenciaRepository } from "../database/PrismaIncidenciaRepository";
import {
  RegistrarIncidenciaUseCase,
  ActualizarIncidenciaUseCase,
} from "../../application/use-cases/incidencias/RegistrarYActualizar.usecase";
import {
  AsignarBrigadistaUseCase,
  AsignarEquipoUseCase,
  AutoasignarmeUseCase,
  AgregarPersonaUseCase,
  AgregarEvidenciasUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
  CorregirYReenviarUseCase,
} from "../../application/use-cases/incidencias/FlujoCampo.usecase";
import {
  RegistrarAtencionUseCase,
  IniciarSeguimientoUseCase,
  AgregarSeguimientoUseCase,
  CerrarCasoUseCase,
} from "../../application/use-cases/incidencias/AtencionYCierre.usecase";
import { AbrirRondaVotacionUseCase } from "../../application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { PrismaComiteDonacionesRepository } from "../database/PrismaComiteDonacionesRepository";

/** Composition root del flujo de Incidencias (DI manual). */
export function makeIncidenciaUseCases() {
  const repo = new PrismaIncidenciaRepository();
  const comite = new PrismaComiteDonacionesRepository();
  const abrirRonda = new AbrirRondaVotacionUseCase(comite);
  return {
    registrar: new RegistrarIncidenciaUseCase(repo),
    actualizar: new ActualizarIncidenciaUseCase(repo),
    asignar: new AsignarBrigadistaUseCase(repo),
    asignarEquipo: new AsignarEquipoUseCase(repo),
    autoasignarme: new AutoasignarmeUseCase(repo),
    agregarPersona: new AgregarPersonaUseCase(repo),
    agregarEvidencias: new AgregarEvidenciasUseCase(repo),
    registrarCampo: new RegistrarLevantamientoUseCase(repo),
    generarInforme: new GenerarInformeEvaluacionUseCase(repo, abrirRonda),
    corregir: new CorregirYReenviarUseCase(repo, abrirRonda),
    registrarAtencion: new RegistrarAtencionUseCase(repo),
    iniciarSeguimiento: new IniciarSeguimientoUseCase(repo),
    agregarSeguimiento: new AgregarSeguimientoUseCase(repo),
    cerrar: new CerrarCasoUseCase(repo),
  };
}
```

(Nota: `decisionComite` se elimina; quien lo usaba migra a la factory del comité.)

- [ ] **Step 4: Eliminar `DecisionComiteUseCase` y su test**

```bash
rm core/application/use-cases/incidencias/DecisionComite.usecase.ts
rm tests/unit/incidencias/DecisionComite.usecase.test.ts
```

- [ ] **Step 5: Validar build + suite de tests existente**

Run:
```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc 0 errores (excepto los que vienen de `app/actions/incidents.ts` por `decisionComite` — se arreglan en Task 9). Si aparece ese error específico, registralo mentalmente y continúa; lo borraremos en la siguiente tarea. Tests del dominio del comité y del resto del flujo: PASS.

- [ ] **Step 6: Commit**

```bash
git add core/infrastructure/factories \
        core/application/use-cases/incidencias/FlujoCampo.usecase.ts
git add -u core/application/use-cases/incidencias/DecisionComite.usecase.ts \
           tests/unit/incidencias/DecisionComite.usecase.test.ts
git commit -m "feat(donaciones): factory del comité y apertura automática de ronda"
```

---

### Task 9: Server actions del Comité y rewire de `incidents.ts`

**Files:**
- Create: `app/actions/comite-donaciones.ts`
- Modify: `app/actions/incidents.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function votarComite(
    incidenciaId: string,
    decision: "A_FAVOR" | "EN_CONTRA"
  ): Promise<{ message?: string }>;

  export async function observarCasoComite(
    incidenciaId: string,
    observaciones: string
  ): Promise<{ message?: string }>;

  export async function obtenerTallyComite(
    incidenciaId: string
  ): Promise<TallyRonda | null>;
  ```
- `aprobarCaso`, `rechazarCaso`, `observarCaso` desaparecen de `app/actions/incidents.ts`.
- `notificarDecisionComite` se exporta para que `app/actions/comite-donaciones.ts` lo invoque al cierre.

- [ ] **Step 1: Crear `app/actions/comite-donaciones.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { logGRDAction } from "@/app/lib/audit";
import { makeComiteDonacionesUseCases } from "@/core/infrastructure/factories/makeComiteDonacionesUseCases";
import { notificarDecisionComite } from "./incidents";
import { TallyRonda } from "@/core/domain/entities/comite-donaciones/VotoComite";

function asMessage(err: unknown): { message: string } {
  const message = err instanceof Error ? err.message : "Error desconocido.";
  return { message };
}

function revalidar(incidenciaId: string) {
  revalidatePath("/donaciones");
  revalidatePath(`/grd/${incidenciaId}`);
}

export async function votarComite(
  incidenciaId: string,
  decision: "A_FAVOR" | "EN_CONTRA"
): Promise<{ message?: string }> {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  try {
    const res = await makeComiteDonacionesUseCases().registrarVoto.execute(
      incidenciaId,
      idUsuarioGRD,
      decision
    );

    await logGRDAction({
      userId: session.userId,
      action: "VOTAR",
      entity: "VotoComite",
      entityId: incidenciaId,
      entityName: incidenciaId,
      module: "Donaciones",
      notes: `decision=${decision} estado=${res.estado}`,
    });

    if (res.estado === "APROBADA") {
      notificarDecisionComite(incidenciaId, "APROBAR");
    } else if (res.estado === "RECHAZADA") {
      notificarDecisionComite(incidenciaId, "RECHAZAR");
    }
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
  return {};
}

export async function observarCasoComite(
  incidenciaId: string,
  observaciones: string
): Promise<{ message?: string }> {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  try {
    await makeComiteDonacionesUseCases().observarCaso.execute(
      incidenciaId,
      idUsuarioGRD,
      observaciones
    );
    await logGRDAction({
      userId: session.userId,
      action: "OBSERVAR",
      entity: "RondaVotacionComite",
      entityId: incidenciaId,
      entityName: incidenciaId,
      module: "Donaciones",
      notes: observaciones,
    });
    notificarDecisionComite(incidenciaId, "OBSERVAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
  return {};
}

export async function obtenerTallyComite(incidenciaId: string): Promise<TallyRonda | null> {
  await verifySession();
  return makeComiteDonacionesUseCases().tally(incidenciaId);
}
```

- [ ] **Step 2: Modificar `app/actions/incidents.ts`**

En `app/actions/incidents.ts`:

1. Cambiar la firma de `notificarDecisionComite` para que se exporte:

```ts
export function notificarDecisionComite(
  incidenciaId: string,
  decision: "APROBAR" | "OBSERVAR" | "RECHAZAR",
  observaciones?: string | null
) {
  // ... (cuerpo igual al actual en app/actions/incidents.ts:407)
}
```

2. Eliminar las exportaciones obsoletas `aprobarCaso`, `observarCaso` y `rechazarCaso` (líneas ~464–495 actuales). Quien las consumía debe migrarse a `comite-donaciones.ts` en la Task 10.

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit`
Expected: errores únicamente en lugares que aún importan `aprobarCaso/rechazarCaso/observarCaso` desde `incidents.ts` (los arreglamos en Task 10). Si surge cualquier otro error, fix it.

- [ ] **Step 4: Commit**

```bash
git add app/actions/comite-donaciones.ts app/actions/incidents.ts
git commit -m "feat(donaciones): server actions de votación y observación"
```

---

### Task 10: UI — Panel de votación del Comité

**Files:**
- Create: `app/lib/comite-donaciones-tally.ts`
- Create: `app/ui/donaciones/PanelVotacionComite.tsx`
- Modify: `app/(protected)/donaciones/page.tsx`
- Modify: `app/ui/donaciones/donaciones-module.tsx`
- Modify: `app/ui/donaciones/DonacionesModule.tsx`

**Interfaces:**
- Consumes: `votarComite`, `observarCasoComite`, `obtenerTallyComite`.
- Produces:
  ```ts
  // app/lib/comite-donaciones-tally.ts
  export async function cargarTallyParaPagina(
    idIncidencia: string
  ): Promise<TallyRondaConNombres | null>;

  // app/ui/donaciones/PanelVotacionComite.tsx
  export function PanelVotacionComite(props: {
    idIncidencia: string;
    soyMiembroDelComite: boolean;
    miIdUsuarioGRD: string | null;
    tally: TallyRondaConNombres | null;
  }): JSX.Element;
  ```
  donde `TallyRondaConNombres` extiende `TallyRonda` con `Array<{ idUsuarioGRD, nombre, decision, fecha }>` para los votos y un campo `pendientesNombres: string[]`.

- [ ] **Step 1: Crear el helper `cargarTallyParaPagina`**

Crear `app/lib/comite-donaciones-tally.ts`:

```ts
import "server-only";
import { prisma } from "@/app/lib/prisma";
import { obtenerTallyComite } from "@/app/actions/comite-donaciones";

export type TallyVotoConNombre = {
  idUsuarioGRD: string;
  nombre: string;
  decision: "A_FAVOR" | "EN_CONTRA";
  fecha: string;
};

export type TallyRondaConNombres = {
  n: number;
  umbral: number;
  aFavor: number;
  enContra: number;
  pendientes: number;
  votos: TallyVotoConNombre[];
  pendientesNombres: string[];
};

export async function cargarTallyParaPagina(
  idIncidencia: string
): Promise<TallyRondaConNombres | null> {
  const tally = await obtenerTallyComite(idIncidencia);
  if (!tally) return null;

  const miembros = await prisma.usuarioGRD.findMany({
    where: { credencial: { role: "COMITEDONACIONES", estado: "ACTIVO" } },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
  });
  const nombrePorId = new Map(
    miembros.map((m) => [m.idUsuarioGRD, `${m.nombres} ${m.apellidos ?? ""}`.trim()])
  );

  const votos = tally.votos.map((v) => ({
    idUsuarioGRD: v.idUsuarioGRD,
    nombre: nombrePorId.get(v.idUsuarioGRD) ?? "Miembro retirado",
    decision: v.decision,
    fecha: v.fecha.toISOString(),
  }));
  const idsQueVotaron = new Set(tally.votos.map((v) => v.idUsuarioGRD));
  const pendientesNombres = miembros
    .filter((m) => !idsQueVotaron.has(m.idUsuarioGRD))
    .map((m) => `${m.nombres} ${m.apellidos ?? ""}`.trim());

  return {
    n: tally.n,
    umbral: tally.umbral,
    aFavor: tally.aFavor,
    enContra: tally.enContra,
    pendientes: tally.pendientes,
    votos,
    pendientesNombres,
  };
}
```

- [ ] **Step 2: Crear el componente `PanelVotacionComite`**

Crear `app/ui/donaciones/PanelVotacionComite.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, MessageSquareWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { votarComite, observarCasoComite } from "@/app/actions/comite-donaciones";
import type { TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";

type Props = {
  idIncidencia: string;
  soyMiembroDelComite: boolean;
  miIdUsuarioGRD: string | null;
  tally: TallyRondaConNombres | null;
};

export function PanelVotacionComite({
  idIncidencia,
  soyMiembroDelComite,
  miIdUsuarioGRD,
  tally,
}: Props) {
  const [observacion, setObservacion] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!tally) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Aún no hay ronda de votación abierta.
      </div>
    );
  }

  const miVoto = miIdUsuarioGRD
    ? tally.votos.find((v) => v.idUsuarioGRD === miIdUsuarioGRD)?.decision ?? null
    : null;

  const ejecutarVoto = (decision: "A_FAVOR" | "EN_CONTRA") => {
    startTransition(async () => {
      const res = await votarComite(idIncidencia, decision);
      if (res.message) toast.error(res.message);
      else toast.success(decision === "A_FAVOR" ? "Voto a favor registrado" : "Voto en contra registrado");
    });
  };

  const ejecutarObservar = () => {
    if (!observacion.trim()) {
      toast.error("Escribe las observaciones");
      return;
    }
    startTransition(async () => {
      const res = await observarCasoComite(idIncidencia, observacion);
      if (res.message) toast.error(res.message);
      else {
        toast.success("Caso observado y devuelto al GRD");
        setObservacion("");
      }
    });
  };

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <header className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Votación del Comité</h3>
        <span className="text-sm text-muted-foreground">
          Umbral: {tally.umbral} de {tally.n}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
          A favor: <strong>{tally.aFavor}</strong>
        </div>
        <div className="rounded-md bg-rose-50 p-3 text-rose-900">
          En contra: <strong>{tally.enContra}</strong>
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-slate-900">
          Pendientes: <strong>{tally.pendientes}</strong>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Detalle de votos</h4>
        <ul className="text-sm space-y-1">
          {tally.votos.map((v) => (
            <li key={v.idUsuarioGRD} className="flex justify-between">
              <span>{v.nombre}</span>
              <span className={v.decision === "A_FAVOR" ? "text-emerald-700" : "text-rose-700"}>
                {v.decision === "A_FAVOR" ? "A favor" : "En contra"}
              </span>
            </li>
          ))}
          {tally.pendientesNombres.map((nombre) => (
            <li key={nombre} className="flex justify-between text-muted-foreground">
              <span>{nombre}</span>
              <span>Pendiente</span>
            </li>
          ))}
        </ul>
      </div>

      {soyMiembroDelComite && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => ejecutarVoto("A_FAVOR")}
              disabled={isPending || miVoto === "A_FAVOR"}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Votar a favor
            </button>
            <button
              type="button"
              onClick={() => ejecutarVoto("EN_CONTRA")}
              disabled={isPending || miVoto === "EN_CONTRA"}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Votar en contra
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="obs-comite">
              Observar y devolver al GRD
            </label>
            <textarea
              id="obs-comite"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="w-full rounded-md border p-2 text-sm"
              placeholder="Describe qué falta o qué se debe corregir"
            />
            <button
              type="button"
              onClick={ejecutarObservar}
              disabled={isPending || !observacion.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              <MessageSquareWarning className="w-4 h-4" />
              Observar caso
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Conectar el panel desde la página `/donaciones`**

Editar `app/(protected)/donaciones/page.tsx`. Donde se construyen los datos del caso seleccionado (o donde se renderiza el módulo), añadir:

```tsx
import { cargarTallyParaPagina } from "@/app/lib/comite-donaciones-tally";
import { PanelVotacionComite } from "@/app/ui/donaciones/PanelVotacionComite";
import { auth } from "@/auth";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";

// dentro del Server Component:
const session = await auth();
const role = session?.user?.role ?? "";
const idUsuarioGRD = await getUsuarioGRDId();
const soyMiembroDelComite = role === "COMITEDONACIONES";
// para cada caso EN EVALUACION que se renderice, cargar:
const tally = await cargarTallyParaPagina(idIncidencia);
```

Y reemplazar en la sección de panel del caso seleccionado los botones unipersonales por `<PanelVotacionComite idIncidencia={...} soyMiembroDelComite={...} miIdUsuarioGRD={idUsuarioGRD} tally={tally} />`.

(En la práctica el archivo ya existe y arma su props. Mantener su shape; añadir las props nuevas y pasarlas al módulo cliente.)

- [ ] **Step 4: Reemplazar botones en `donaciones-module.tsx`**

Editar `app/ui/donaciones/donaciones-module.tsx`:

1. Quitar el import `import { aprobarCaso, observarCaso, rechazarCaso } from "@/app/actions/incidents";` (línea 25).
2. Eliminar la función `decidir(...)` y todos los botones `Aprobar / Observar / Rechazar` (zonas alrededor de líneas 181, 605, 609).
3. Añadir en el panel del caso seleccionado (donde están esos botones) el render:

```tsx
import { PanelVotacionComite } from "./PanelVotacionComite";

{current.estado === "EN EVALUACION" && (
  <PanelVotacionComite
    idIncidencia={current.id}
    soyMiembroDelComite={props.soyMiembroDelComite}
    miIdUsuarioGRD={props.miIdUsuarioGRD}
    tally={props.tallyPorCaso[current.id] ?? null}
  />
)}
```

4. Extender el tipo `Props` del módulo con `soyMiembroDelComite: boolean`, `miIdUsuarioGRD: string | null`, `tallyPorCaso: Record<string, TallyRondaConNombres | null>`.

- [ ] **Step 5: Limpiar `DonacionesModule.tsx`**

Editar `app/ui/donaciones/DonacionesModule.tsx`:

1. Eliminar las funciones internas `aprobarCaso`, `observarCaso`, `rechazarCaso`, `handleAprobar`, `handleObservar`, `handleRechazar` (líneas ~141–246).
2. Eliminar los botones equivalentes en el JSX del panel (~líneas 895).
3. Reemplazar por `<PanelVotacionComite ... />` con las mismas props que en `donaciones-module.tsx`.

(Si solo uno de los dos módulos está en uso real, marcarlo en el commit message; pero conviene tener ambos consistentes para evitar drift.)

- [ ] **Step 6: Verificar compilación y arranque del dev server**

Run:
```bash
npx tsc --noEmit
npm run dev
```
Expected: tsc 0 errores. El dev server arranca sin errores. Navegar manualmente a `/donaciones`, abrir un caso en `EN EVALUACION`, comprobar que se muestra el tally y los botones (deshabilitados si el usuario no es del comité). Cerrar con `Ctrl+C`.

- [ ] **Step 7: Commit**

```bash
git add app/lib/comite-donaciones-tally.ts \
        app/ui/donaciones/PanelVotacionComite.tsx \
        app/ui/donaciones/donaciones-module.tsx \
        app/ui/donaciones/DonacionesModule.tsx \
        app/\(protected\)/donaciones/page.tsx
git commit -m "feat(donaciones): UI panel de votación y tally en vivo"
```

---

### Task 11: Script de backfill para incidencias actualmente en EN EVALUACION

**Files:**
- Create: `prisma/backfill-rondas-en-evaluacion.ts`

**Interfaces:**
- Produces: script ejecutable con `tsx` que abre una ronda 1 vacía por cada incidencia en `EN EVALUACION` sin ronda existente.

- [ ] **Step 1: Crear el script**

Crear `prisma/backfill-rondas-en-evaluacion.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidatas = await prisma.incidencia.findMany({
    where: {
      estadoActual: "EN EVALUACION",
      rondasVotacionComite: { none: {} },
    },
    select: { idIncidencia: true },
  });

  for (const inc of candidatas) {
    await prisma.rondaVotacionComite.create({
      data: { idIncidencia: inc.idIncidencia, numeroRonda: 1, estado: "ABIERTA" },
    });
    console.log("Ronda 1 abierta para", inc.idIncidencia);
  }
  console.log(`Total: ${candidatas.length} rondas creadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Ejecutar y verificar**

Run:

```bash
npx tsx prisma/backfill-rondas-en-evaluacion.ts
```

Expected: salida con N rondas creadas. Volver a ejecutar: 0 rondas creadas (idempotente porque el filtro `rondasVotacionComite: { none: {} }` excluye las ya migradas).

- [ ] **Step 3: Commit**

```bash
git add prisma/backfill-rondas-en-evaluacion.ts
git commit -m "chore(donaciones): backfill de rondas para incidencias EN EVALUACION"
```

---

### Task 12: Verificación end-to-end y limpieza

**Files:** (sin cambios; solo verificación)

- [ ] **Step 1: Suite completa de tests**

Run:
```bash
npx vitest run
```
Expected: TODO PASS.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3: Smoke test manual con `npm run dev`**

Run: `npm run dev`
Pasos manuales (con la DB de desarrollo):
1. Loguearse como un usuario `COMITEDONACIONES` activo.
2. Abrir `/donaciones`, seleccionar un caso en `EN EVALUACION`.
3. Confirmar que aparece el tally con `Umbral: U de N`.
4. Votar a favor; refrescar; el voto aparece en la lista y el `aFavor` aumenta.
5. Cambiar el voto a en contra; el contador se actualiza.
6. Con un segundo usuario del comité, votar hasta superar el umbral; verificar que el caso pasa a `APROBADO` y se envía la notificación al GRD.
7. En otro caso, observarlo con un comentario; verificar que pasa a `OBSERVADO` y la ronda se cierra.
8. Reabrirlo con el flujo de "corregir y reenviar" del GRD; verificar que se crea ronda 2 y los votos de la ronda 1 no aparecen en el panel.

Si algo falla, abrir issue/anotación e iterar.

- [ ] **Step 4: Verificar la regla de rechazo automático**

Manualmente: en un caso con `N = 10`, hacer que 7 miembros voten en contra. Verificar que el caso pasa automáticamente a `RECHAZADO` sin esperar más votos. `nSnapshot=10`, `umbralSnapshot=4` en la fila de la ronda cerrada (`SELECT * FROM ronda_votacion_comite WHERE id_incidencia = '<id>'`).

- [ ] **Step 5: Commit de cierre (si quedan ajustes)**

```bash
git status
# si quedó algún ajuste menor del smoke test
git add -p
git commit -m "fix(donaciones): ajustes finales del flujo de quórum"
```

- [ ] **Step 6: Crear PR**

```bash
git push -u origin feat/sergiodelacruz/quorum-comite-donaciones
gh pr create --title "feat(donaciones): aprobación por quórum del Comité" --body "$(cat <<'EOF'
## Summary
- Reemplaza la decisión unipersonal del Comité de Donaciones por una votación con quórum `min(4, mayoría)`.
- Añade tablas `RondaVotacionComite` y `VotoComiteDonaciones` con migración Prisma + backfill.
- Server actions: `votarComite` y `observarCasoComite`. Notificación al GRD solo al cierre.
- UI: panel de votación con tally en vivo (X a favor / Y en contra / Z pendientes / umbral U de N) y lista de quién votó qué.

## Test plan
- [ ] `npx vitest run` (incluye `tests/unit/comite-donaciones/*`).
- [ ] `npx tsc --noEmit`.
- [ ] Votar como miembro del Comité, alcanzar quórum → caso APROBADO.
- [ ] Provocar rechazo automático con suficientes votos en contra.
- [ ] Observar un caso → vuelve al GRD; reapertura crea ronda 2.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §2 reglas → Tasks 2, 5, 6 (umbral y evaluación cubiertos por `calcularUmbral`/`evaluarQuorum`, aprobación, rechazo automático, observación, reapertura).
- §3 modelo → Task 1.
- §4 dominio → Tasks 3, 4, 5, 6.
- §5 server actions → Task 9.
- §6 UI → Task 10.
- §7 permisos → validados en Tasks 5, 6 (use cases) + Task 10 (UI lo refleja con `soyMiembroDelComite`).
- §8 casos borde → Task 2 (N=0, N=1), Tasks 5/6 (idempotencia, ronda inexistente), Task 12 (manual de rechazo automático).
- §9 plan de pruebas → Tasks 2, 4, 5, 6.
- §10 migración / backfill → Tasks 1, 11.
- §11 fuera de alcance → no se implementan plazos ni configuración fija.

**Placeholder scan:** sin TBDs, sin "implement later". Todos los snippets contienen el código real.

**Type consistency:**
- `DecisionVoto = "A_FAVOR" | "EN_CONTRA"` usado consistente en repo, use cases, server actions y UI.
- `CierreRonda` con `nSnapshot`, `umbralSnapshot`, `idUsuarioCierre`, `observaciones` consistente entre interfaz, implementación Prisma y use cases.
- `TallyRonda` igual entre dominio, repo, server action y página.
- `ResultadoVoto.estado` valores `"EN_CURSO" | "APROBADA" | "RECHAZADA"` consistentes entre use case y server action.

Sin issues encontrados; el plan está completo.
