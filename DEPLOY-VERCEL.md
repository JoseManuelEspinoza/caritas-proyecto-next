# Desplegar la app (Next.js) en Vercel — Cáritas

Arquitectura final:

```
  Usuario ──► App Next.js (Vercel) ──OIDC──► Keycloak (Render) ──► PostgreSQL Keycloak (Neon)
                   │
                   └──► PostgreSQL de la app (AWS RDS)   +   S3 (evidencias)   +   Gmail (SMTP)
```

- **Keycloak** ya está desplegado en Render. La app solo lo consume por su URL.
- Cada `git push` a la rama de producción = **redeploy automático** en Vercel.

---

## Paso 0 — Ya hecho

- `package.json` → `build` ahora es `prisma generate && next build` (Vercel necesita
  generar el cliente Prisma en cada build).

Súbelo a GitHub:
```bash
git add package.json DEPLOY-VERCEL.md
git commit -m "App: preparar build para Vercel (prisma generate)"
git push
```

---

## Paso 1 — Importar el proyecto en Vercel

1. https://vercel.com → entra con GitHub (plan **Hobby**, gratis, sin tarjeta).
2. **Add New… → Project** → elige el repo `caritas-proyecto-next`.
3. **Framework Preset:** Next.js (lo detecta solo).
4. **Root Directory:** `.` (raíz; déjalo por defecto).
5. **NO despliegues aún** → primero pega las variables (Paso 2).

---

## Paso 2 — Variables de entorno en Vercel

En **Environment Variables**, agrégalas TODAS (Environment: Production, y también
Preview si quieres probar ramas):

```
# ─── Base de datos de la APP (AWS RDS) ───────────────────────────────────────
DATABASE_URL=postgresql://postgres:CaritasDB_2026_Test@caritas-grd-db.c2sjosirydcu.us-east-1.rds.amazonaws.com:5432/caritas_db?schema=public&uselibpqcompat=true&sslmode=require

# ─── Auth.js v5 + Keycloak (Render) ──────────────────────────────────────────
AUTH_SECRET=<genera con: openssl rand -base64 32>
AUTH_TRUST_HOST=true
AUTH_URL=https://TU-APP.vercel.app
AUTH_KEYCLOAK_ID=caritas-app
AUTH_KEYCLOAK_SECRET=caritas-app-secret-dev
AUTH_KEYCLOAK_ISSUER=https://caritas-proyecto-next.onrender.com/realms/caritas

# ─── Keycloak Admin API (crear brigadistas, etc.) ────────────────────────────
KEYCLOAK_ADMIN_URL=https://caritas-proyecto-next.onrender.com
KEYCLOAK_REALM=caritas
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASS=PonUnaClaveFuerte123!

# ─── Email (Gmail con App Password) ──────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASS=tu-key-de-app-16-letras
SMTP_FROM=tu-cuenta@gmail.com

# ─── App ─────────────────────────────────────────────────────────────────────
APP_URL=https://TU-APP.vercel.app

# ─── Amazon S3 (evidencias) ──────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_S3_BUCKET=<tu-bucket>
AWS_ACCESS_KEY_ID=<tu-key>
AWS_SECRET_ACCESS_KEY=<tu-secret>

# ─── Consulta DNI (RENIEC) ───────────────────────────────────────────────────
RENIEC_API_URL=<tu-url>
RENIEC_AUTH_MODE=<query|header>
RENIEC_API_TOKEN=<tu-token>
```

> ❌ NO definas `AUTH_KEYCLOAK_INTERNAL_URL` (rompe el intercambio de token).
> `NODE_ENV=production` lo pone Vercel solo, no hace falta.
> `AUTH_URL` / `APP_URL`: en el primer deploy aún no sabes la URL. Puedes poner
> un placeholder, desplegar, copiar la URL real que asigna Vercel y volver a
> editarlas + redeploy. (Con `AUTH_TRUST_HOST=true` suele funcionar aunque no
> sea exacta, pero es mejor dejarla correcta.)

Ahora sí → **Deploy**. Vercel instala, corre `prisma generate && next build` y publica.

---

## Paso 3 — Registrar la URL de Vercel en Keycloak (¡clave!)

Sin esto el login falla con *Invalid redirect URI*.

1. Abre `https://caritas-proyecto-next.onrender.com/admin` → realm **caritas**.
2. **Clients → `caritas-app` → Settings**.
3. **Valid redirect URIs** → añade: `https://TU-APP.vercel.app/*`
4. **Valid post logout redirect URIs** → añade: `https://TU-APP.vercel.app/*`
5. **Web origins** → añade: `https://TU-APP.vercel.app`
6. **Save**.

---

## Paso 4 — Probar

1. Abre `https://TU-APP.vercel.app/login`.
2. Redirige a Keycloak (Render) → inicias sesión → vuelves autenticado.
3. Prueba crear un brigadista → debe aparecer en Keycloak (Users).
4. Prueba algo que mande correo → debe llegar por Gmail.

---

## Redeploy fácil (lo que pediste)

- Cualquier `git push` a la rama de producción → Vercel **redespliega solo**.
- Otras ramas/PRs → Vercel crea un **Preview Deploy** (URL temporal para probar).
- Si cambias una variable de entorno → hay que hacer **Redeploy** desde Vercel.

---

## Notas / cosas a vigilar

- **Esquema de BD:** tu RDS ya tiene las tablas (lo vienes usando). NO se corre
  `prisma db push` en el build de Vercel (sería peligroso). Si cambias el
  `schema.prisma`, aplica los cambios a RDS aparte (`npx prisma db push` desde tu
  máquina apuntando a RDS) antes/después de desplegar.
- **OCR/PDF:** corre en el navegador del usuario → NO afecta los límites de Vercel.
- **Cold start de Keycloak (Render free):** el primer login del día puede tardar
  ~1 min si Render se durmió. Mitiga con un ping (cron-job.org) cada 10 min.
- **Seguridad:** la contraseña de RDS está en el repo (docker-compose). Conviene
  rotarla y dejarla solo como variable de entorno (Vercel/Render), no en git.
```
