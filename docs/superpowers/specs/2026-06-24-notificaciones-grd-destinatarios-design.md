# Notificaciones del flujo GRD — Ver destinatarios

**Fecha:** 2026-06-24
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## 1. Contexto

El sistema ya envía notificaciones en los pasos clave del flujo GRD
(`notificarRoles`, `notificarBrigadistas`, `notificarUsuario` en
`app/lib/notificaciones.ts`), y los usuarios las ven en la campana del
dashboard (`app/ui/dashboard/shell.tsx`). Lo que no existe es:

1. **Preview pre-envío**: el usuario que va a disparar una acción (ej. enviar
   informe al Comité) no sabe a quiénes llegará la notificación.
2. **Historial post-envío**: en el detalle de la incidencia no hay registro de
   quién fue notificado en cada paso del flujo.

## 2. Alcance

Los pasos cubiertos son los de mayor valor informativo:

| Paso | Tipo notificación | Destinatarios |
|------|-------------------|---------------|
| Nueva incidencia | `INCIDENCIA_NUEVA` | Roles `ESPECIALISTAGRD` + `ADMINISTRADOR` |
| Asignación de equipo | `RESPONSABLE_ASIGNADO` / `BRIGADISTA_ASIGNADO` | Brigadistas seleccionados |
| Envío de informe al Comité | `INFORME_ENVIADO_COMITE` | Roles `COMITEDONACIONES` + `JEFAOGP` |
| Decisión del Comité | `DECISION_APROBADO` / `DECISION_OBSERVADO` / `DECISION_RECHAZADO` | Usuario responsable GRD de la incidencia |

El preview pre-envío se muestra en los dos pasos más críticos:
**Enviar al Comité** y **Decisión del Comité**. La asignación de equipo y la
nueva incidencia solo aparecen en el historial (el actor ya sabe a quién
está asignando / es una acción inmediata con redirect).

## 3. Modelo de datos

### 3.1 Cambio a `Notificacion`

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

  // NUEVO — FK opcional hacia la incidencia que originó la notificación
  idIncidencia   String?
  incidencia     Incidencia? @relation(fields: [idIncidencia], references: [idIncidencia], onDelete: SetNull)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, leida, createdAt])
  @@index([idIncidencia, tipo, createdAt])  // NUEVO
  @@map("notificaciones")
}
```

### 3.2 Relación inversa en `Incidencia`

```prisma
notificaciones Notificacion[]
```

El campo es nullable. Las notificaciones de otros módulos (capacitaciones, etc.)
quedan con `idIncidencia = null` y no aparecen en el historial de ninguna
incidencia. Las notificaciones enviadas antes de esta migración también quedan
con `null` — comportamiento correcto.

## 4. Capa de notificaciones (`app/lib/notificaciones.ts`)

Las tres funciones internas (`crearNotificacion`, `crearNotificacionParaRoles`,
`crearNotificacionParaBrigadistas`) y las cuatro públicas exportadas
(`notificarUsuario`, `notificarRoles`, `notificarBrigadistas`, `notificarPorEmail`)
agregan un parámetro final opcional `incidenciaId?: string`.

El parámetro se pasa al `prisma.notificacion.create` / `createMany` como
`idIncidencia: incidenciaId ?? null`.

Las llamadas existentes que no pasan `incidenciaId` siguen funcionando sin
cambio (parámetro opcional al final).

## 5. Actualización de callers en `app/actions/incidents.ts`

Cada llamada a `notificarRoles` / `notificarBrigadistas` / `notificarUsuario`
del flujo GRD recibe el `incidenciaId` como último argumento:

- `createIncidente` → `notificarRoles([...], ..., id)` (dentro del redirect, se
  pasa el `id` recién creado)
- `assignBrigadista` → `notificarBrigadistas([brigadistaId], ..., incidenciaId)`
- `assignEquipo` → `notificarAsignacion(incidenciaId, todosIds, ...)` y
  `notificarEquipoAsignado(incidenciaId, ...)` — ambas funciones internas también
  reciben el `incidenciaId` y lo propagan
- `saveInformeEvaluacion` → `notificarRoles([...], ..., incidenciaId)`
- `notificarDecisionComite` → `notificarUsuario(userId, ..., incidenciaId)`

## 6. Server action de preview

Nueva función exportada en `app/actions/incidents.ts`:

```ts
export async function getDestinatariosNotificacion(
  step: "informe" | "decision",
  incidenciaId: string
): Promise<{ nombre: string; email: string; rol: string }[]>
```

- **`"informe"`**: consulta `prisma.user.findMany` donde `role IN ['COMITEDONACIONES', 'JEFAOGP']` y `estado = 'ACTIVO'`. Devuelve `{ nombre: user.name, email: user.email, rol: user.role }`.
- **`"decision"`**: consulta el `usuarioResponsable` de la incidencia (join
  `Incidencia → UsuarioGRD → User`). Devuelve ese único usuario.

Requiere sesión autenticada (llama `verifySession()` internamente).

## 7. Endpoint de historial

Nuevo route handler:
`app/api/notificaciones/incidencia/[id]/route.ts`

```
GET /api/notificaciones/incidencia/:incidenciaId
```

- Requiere sesión autenticada.
- Consulta:
  ```ts
  prisma.notificacion.findMany({
    where: { idIncidencia: id },
    orderBy: { createdAt: "asc" },
    select: {
      tipo: true,
      titulo: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  })
  ```
- Devuelve los registros agrupados por `tipo` en el JSON response. Dentro de
  cada grupo, `enviadoAt` es el `createdAt` del primer registro del grupo
  (todos los de un mismo evento se crean en la misma llamada a `createMany`,
  por lo que sus timestamps son prácticamente iguales):
  ```json
  [
    {
      "tipo": "INFORME_ENVIADO_COMITE",
      "titulo": "Informe enviado al Comité",
      "enviadoAt": "2026-06-23T14:32:00Z",
      "destinatarios": [
        { "nombre": "Ana Torres", "email": "...", "rol": "COMITEDONACIONES" },
        { "nombre": "Luis Ríos",  "email": "...", "rol": "COMITEDONACIONES" }
      ]
    },
    ...
  ]
  ```

## 8. Componentes UI

### 8.1 `DestinatariosPreview`

**Archivo:** `app/ui/grd/incidente/components/DestinatariosPreview.tsx`

Componente cliente. Props: `step: "informe" | "decision"`, `incidenciaId: string`.

Al montar, llama a la server action `getDestinatariosNotificacion` y guarda el
resultado en estado local. Renderiza:

```
ℹ 3 personas serán notificadas ▾
  ┌────────────────────────────────┐
  │ • Ana Torres  — Comité         │
  │ • Luis Ríos   — Comité         │
  │ • María Díaz  — Jefa OGP       │
  └────────────────────────────────┘
```

El chip es un `<button>` que toglea la lista (no un tooltip de hover, para
funcionar bien en móvil). Se coloca **encima del botón de acción principal** en
cada contexto:

- En `RevisionStep.tsx`: encima del botón "Enviar al Comité" / "Reenviar al
  Comité" (step `"informe"`).
- En `donaciones-module.tsx`: encima de los botones de decisión Aprobar /
  Observar / Rechazar (step `"decision"`).

Si la lista está vacía (sin usuarios activos con ese rol) muestra un warning
discreto: _"No hay destinatarios configurados para este paso."_

### 8.2 `NotificacionesHistorial`

**Archivo:** `app/ui/grd/incidente/components/NotificacionesHistorial.tsx`

Componente cliente. Props: `incidenciaId: string`.

Al montar, hace `fetch("/api/notificaciones/incidencia/${incidenciaId}")` y
renderiza el resultado. Bloque colapsable del mismo estilo visual que "Historial
de estados" en `ResumenStep.tsx`.

Mapa de labels para cada `tipo`:

| Tipo | Label |
|------|-------|
| `INCIDENCIA_NUEVA` | Nueva incidencia registrada |
| `RESPONSABLE_ASIGNADO` | Responsable de equipo asignado |
| `BRIGADISTA_ASIGNADO` | Brigadistas asignados |
| `INFORME_ENVIADO_COMITE` | Informe enviado al Comité |
| `DECISION_APROBADO` | Decisión del Comité: Aprobado |
| `DECISION_OBSERVADO` | Decisión del Comité: Observado |
| `DECISION_RECHAZADO` | Decisión del Comité: Rechazado |

Formato de cada grupo:

```
📢 Informe enviado al Comité  ·  23 jun, 14:32
   └ Ana Torres (Comité de Donaciones)
   └ Luis Ríos (Comité de Donaciones)
   └ María Díaz (Jefa OGP)
```

Si no hay notificaciones registradas para esta incidencia (ej. incidencias
anteriores a la migración), no se renderiza el bloque.

**Ubicación:** se añade como sección "11. Notificaciones enviadas" al final de
`ResumenStep.tsx`, pasando `data.idIncidencia`.

## 9. Migración de base de datos

```
prisma migrate dev --name add-incidencia-to-notificacion
```

El campo `idIncidencia` es nullable. La migración no hace backfill (las
notificaciones existentes quedan con `null`). No hay downtime ya que la columna
nullable se agrega sin bloquear lecturas.

## 10. Testing

- **Unit**: `getDestinatariosNotificacion` con mocks de Prisma para cada `step`.
- **Integration**: `GET /api/notificaciones/incidencia/[id]` verifica auth y
  devuelve los registros correctos agrupados.
- **Manual**: crear incidencia → asignar equipo → enviar informe → verificar que
  el preview muestra los destinatarios correctos y que el historial en ResumenStep
  refleja cada paso.
