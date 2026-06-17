# Aprobación de donaciones por quórum del Comité — Diseño

**Fecha:** 2026-06-16
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## 1. Contexto

Hoy, en el flujo GRD, un caso pasa a estado `EN EVALUACION` y cualquier miembro
del rol `COMITEDONACIONES` puede aprobarlo, observarlo o rechazarlo en un solo
clic. La decisión es individual y unipersonal:

- `core/application/use-cases/incidencias/DecisionComite.usecase.ts:17` ejecuta
  directamente `inc.aprobar()`/`observar()`/`rechazar()`.
- `app/actions/incidents.ts:464` expone `aprobarCaso`/`observarCaso`/
  `rechazarCaso` sin contar votos.
- La UI (`app/ui/donaciones/donaciones-module.tsx:181`, `DonacionesModule.tsx:141`)
  muestra un único botón por acción.
- No existe ninguna tabla de votos en `prisma/schema.prisma`.

La regla nueva es que la aprobación de una donación requiera el acuerdo de
varios miembros del comité, no de uno solo.

## 2. Regla de negocio

- **Umbral de aprobación**: `U = min(4, ⌊N/2⌋ + 1)`, donde `N` es la cantidad
  de usuarios activos con rol `COMITEDONACIONES` en el momento del voto que
  se está evaluando. "Activo" = `User.estado = 'ACTIVO'` y `User.role =
  'COMITEDONACIONES'`.
- **Aprobado**: cuando `votosAFavor ≥ U`. Transiciona la incidencia de
  `EN EVALUACION` a `APROBADO`.
- **Rechazo automático**: cuando `votosEnContra > N - U`. En ese momento es
  matemáticamente imposible alcanzar `U` votos a favor, así que la ronda se
  cierra y la incidencia transiciona a `RECHAZADO`.
- **Observado**: cualquier miembro activo del comité puede devolver el caso
  con observaciones en cualquier momento mientras la ronda esté abierta. Eso
  cierra la ronda como `CERRADA_OBSERVADA` y transiciona la incidencia a
  `OBSERVADO`.
- **Reapertura**: cuando una incidencia `OBSERVADO` regresa a `EN EVALUACION`
  tras correcciones, se abre una **ronda nueva**. Los votos de la ronda
  anterior quedan archivados y no cuentan para la nueva.
- **Cambio de voto**: un miembro puede modificar su voto mientras la ronda
  esté abierta. El cambio se registra con `updatedAt` y aparece en auditoría.
- **Sin plazo** de cierre por tiempo en esta iteración.

## 3. Modelo de datos

Se añaden dos tablas a `prisma/schema.prisma`.

### 3.1 `RondaVotacionComite`

| Campo | Tipo | Notas |
|---|---|---|
| `idRonda` | `String @id @default(uuid())` | |
| `idIncidencia` | `String` | FK a `Incidencia` |
| `numeroRonda` | `Int` | 1, 2, 3… secuencial por incidencia |
| `estado` | `String` | `ABIERTA` \| `CERRADA_APROBADA` \| `CERRADA_RECHAZADA` \| `CERRADA_OBSERVADA` |
| `nSnapshot` | `Int?` | `N` al cierre (auditoría) |
| `umbralSnapshot` | `Int?` | `U` al cierre (auditoría) |
| `abiertaAt` | `DateTime @default(now())` | |
| `cerradaAt` | `DateTime?` | |
| `idUsuarioCierre` | `String?` | Quien observó (si aplica) |
| `observaciones` | `String?` | Solo cuando se cierra por observación |
| `createdAt/updatedAt` | timestamps | |

- Unique: `(idIncidencia, numeroRonda)`.
- Índice: `(idIncidencia, estado)` para encontrar rápido la ronda abierta.

### 3.2 `VotoComiteDonaciones`

| Campo | Tipo | Notas |
|---|---|---|
| `idVoto` | `String @id @default(uuid())` | |
| `idRonda` | `String` | FK a `RondaVotacionComite` |
| `idUsuarioGRD` | `String` | FK a `UsuarioGRD` |
| `decision` | `String` | `A_FAVOR` \| `EN_CONTRA` |
| `createdAt/updatedAt` | timestamps | |

- Unique: `(idRonda, idUsuarioGRD)` — un voto por miembro por ronda.
- Índice: `(idRonda, decision)` para tally rápido.

### 3.3 Sin cambios destructivos

No se borran campos existentes ni se cambia la máquina de estados de
`Incidencia`. Sí se eliminan las acciones unipersonales obsoletas a nivel
de UI/server-actions.

## 4. Dominio y casos de uso

### 4.1 `Incidencia` (sin cambios)

Las transiciones `aprobar()`, `rechazar()`, `observar()` se mantienen. Lo que
cambia es **quién** las invoca: ahora siempre desde dentro del use case del
comité, después de evaluar el quórum (o por la acción de observar).

### 4.2 Casos de uso nuevos

Bajo `core/application/use-cases/comite-donaciones/`:

- **`AbrirRondaVotacionUseCase`** — invocado cuando una incidencia entra a
  `EN EVALUACION` (transición inicial o reapertura tras observado). Crea la
  ronda con `numeroRonda = max + 1`. Idempotente: si ya existe una ronda
  `ABIERTA` para esa incidencia, no crea otra.

- **`RegistrarVotoComiteUseCase.execute(idIncidencia, idUsuario, decision)`**:
  1. Carga la ronda abierta. Si no existe, error.
  2. Valida que el usuario es miembro activo del comité.
  3. `upsert` del voto `(idRonda, idUsuarioGRD)` con `decision`.
  4. Calcula `N` actual (cuenta usuarios activos con rol `COMITEDONACIONES`)
     y `U = min(4, ⌊N/2⌋+1)`. Si `N = 0`, error de configuración.
  5. Calcula `aFavor` y `enContra` desde los votos de la ronda.
  6. Si `aFavor ≥ U` → cierra ronda como `CERRADA_APROBADA`,
     `inc.aprobar()`, persiste `nSnapshot`/`umbralSnapshot`.
  7. Si `enContra > N - U` → cierra ronda como `CERRADA_RECHAZADA`,
     `inc.rechazar()`, persiste snapshots.
  8. En otro caso, deja la ronda abierta y devuelve el tally para que la UI
     refresque.

- **`ObservarCasoComiteUseCase.execute(idIncidencia, idUsuario, observaciones)`**:
  1. Valida que el usuario es miembro activo del comité.
  2. Carga la ronda abierta; si no existe, error.
  3. Valida `observaciones` no vacío.
  4. Cierra ronda como `CERRADA_OBSERVADA`, guarda `observaciones` y
     `idUsuarioCierre`.
  5. `inc.observar()`.

### 4.3 `DecisionComiteUseCase` (existente)

Se elimina. Sus llamadas se reemplazan en server actions y tests.

### 4.4 Reapertura tras OBSERVADO

El use case que hace volver una incidencia de `OBSERVADO` a `EN EVALUACION`
(hoy el flujo de re-envío del GRD) debe disparar `AbrirRondaVotacionUseCase`
al final.

## 5. Server actions (`app/actions/incidents.ts`)

- **Reemplazar** `aprobarCaso(incidenciaId, observaciones?)` y
  `rechazarCaso(incidenciaId, observaciones)` por:
  ```ts
  votarComite(incidenciaId: string, decision: "A_FAVOR" | "EN_CONTRA")
  ```
  Internamente invoca `RegistrarVotoComiteUseCase`. Idempotente: si el
  usuario ya tiene ese mismo voto, no-op.

- **Mantener** `observarCaso(incidenciaId, observaciones)` con la nueva
  semántica (cierra la ronda).

- **Notificaciones**: `notificarDecisionComite` (`app/actions/incidents.ts:407`)
  se invoca **solo cuando la ronda cierra** (aprobada / rechazada /
  observada). No por cada voto. El mensaje al GRD responsable debe contener
  el resultado final y, para aprobada/rechazada, el tally final.

- **Auditoría**: `logGRDAction` por:
  - Apertura de ronda (acción `ABRIR_RONDA`, entidad `RondaVotacionComite`).
  - Cada voto registrado o cambiado (acción `VOTAR`, entidad `VotoComite`,
    notes con la decisión).
  - Cierre de ronda (acción `CERRAR_RONDA`, entidad `RondaVotacionComite`,
    notes con resultado y tally).

## 6. UI (`app/ui/donaciones/`)

Para los miembros del comité, en el panel del caso con `status === "EN EVALUACION"`:

- Mostrar el tally en vivo:
  > "A favor: X  ·  En contra: Y  ·  Pendientes: Z  —  Umbral: U de N"
- Mostrar la lista de quién votó qué (transparencia total acordada):
  - Nombre + decisión (A favor / En contra) + fecha del voto.
  - Resto de miembros activos del comité que no han votado, marcados como
    "Pendiente".
- Botones:
  - `Votar a favor` (deshabilitado si ya votó A_FAVOR).
  - `Votar en contra` (deshabilitado si ya votó EN_CONTRA).
  - `Cambiar mi voto` solo si ya votó (atajo a votar lo contrario).
  - `Observar caso` (abre modal de observaciones).
- Eliminar el actual botón "Aprobar/Rechazar" unipersonal de
  `donaciones-module.tsx:605` y de `DonacionesModule.tsx:895`.

Para usuarios que NO son del comité, el panel sigue siendo de solo lectura
del estado, pero ahora también pueden ver el tally público (auditabilidad).

## 7. Permisos

- Solo usuarios con `User.role = COMITEDONACIONES` y `User.estado = ACTIVO`
  pueden invocar `votarComite` y `observarCaso`. Validado en el use case
  (no solo en UI).
- El cómputo de `N` usa exactamente esa misma definición de "miembro
  activo".

## 8. Casos borde y decisiones explícitas

- **N = 0**: no se puede aprobar. `RegistrarVotoComiteUseCase` falla con
  error de configuración antes de llegar a ese punto (no hay miembros
  activos = no hay quien vote). En la UI mostrar warning al admin.
- **N = 1**: `U = 1`. Un solo voto a favor aprueba. Comportamiento aceptado;
  no es un caso operativo realista pero el sistema no se rompe.
- **N cambia durante la ronda**: el cómputo se hace con `N` actual en cada
  voto. Esto puede provocar que un caso que parecía no llegar al umbral
  cierre de golpe si alguien se desactiva. Se registra `nSnapshot` y
  `umbralSnapshot` al cierre para auditoría.
- **Carrera de votos concurrentes**: la persistencia del voto y el cálculo
  de cierre deben ir en una transacción. Si dos votos llegan simultáneos y
  ambos podrían cerrar la ronda, el primero que entre a la transacción
  cierra; el segundo encuentra la ronda cerrada y devuelve error
  "ronda ya cerrada".
- **Idempotencia**: votar lo mismo dos veces es no-op (silencioso).
- **Reapertura**: al reabrir, se crea ronda con `numeroRonda + 1`. No se
  copian votos.

## 9. Plan de pruebas (dominio)

`tests/unit/comite-donaciones/`:

- `RegistrarVotoComite.usecase.test.ts`:
  - Aprueba al alcanzar `U` votos a favor (varios N: 1, 3, 5, 7, 10).
  - Rechaza automáticamente al imposibilitar `U`.
  - Cambio de voto se contabiliza correctamente.
  - Falla si el usuario no es miembro activo.
  - Falla si no hay ronda abierta.
- `ObservarCasoComite.usecase.test.ts`:
  - Cualquier miembro activo puede observar; cierra ronda.
  - Falla si no hay ronda abierta o las observaciones están vacías.
- `AbrirRondaVotacion.usecase.test.ts`:
  - Crea ronda con `numeroRonda = 1` la primera vez.
  - Reapertura tras observado crea ronda 2.
  - Idempotencia: no abre dos rondas activas.

Tests de integración tocando Prisma para garantizar unique constraint y
transacción de cierre.

## 10. Migración / rollout

- Migración Prisma que crea las dos tablas nuevas (no destructiva).
- Backfill: para incidencias actualmente en `EN EVALUACION`, crear una
  ronda `ABIERTA` con `numeroRonda = 1` y sin votos (script idempotente).
- Despliegue puede hacerse en una sola release porque hay que reemplazar
  use case + server actions + UI a la vez.

## 11. Fuera de alcance

- Plazo / expiración automática de rondas.
- Configuración de un comité fijo distinto del rol.
- Voto delegado / suplencia.
- Comité con peso distinto por miembro.
