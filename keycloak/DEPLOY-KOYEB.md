# Desplegar Keycloak en Koyeb (free) — Cáritas

Arquitectura final:

```
   Navegador
      │  login
      ▼
  Next.js (Vercel)  ──OIDC──►  Keycloak (Koyeb)  ──►  PostgreSQL (Neon)
```

- La **app** sigue en Vercel (sin cambios de código).
- **Keycloak** corre en Koyeb desde la imagen de `keycloak/Dockerfile`.
- La **BD de Keycloak** es una PostgreSQL gratis en Neon (SEPARADA de la BD de la app).

> ⚠️ Importante: el realm se importa **solo en el primer arranque**. Si te
> equivocas en algo del realm, lo más fácil es corregirlo luego en la consola
> de admin (`/admin`), no reimportando.

---

## Paso 1 — Crear la base de datos en Neon

1. Entra a https://neon.tech → crea proyecto (región más cercana, p. ej. `AWS us-east-1`).
2. Crea una base de datos llamada `keycloak`.
3. Copia el **connection string**. Se ve así:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-123456.us-east-1.aws.neon.tech/keycloak?sslmode=require
   ```
   > Usa el endpoint **directo** (sin el sufijo `-pooler`) para Keycloak.

De ahí saca 3 valores para Koyeb:

| Variable Koyeb   | Valor                                                             |
|------------------|------------------------------------------------------------------|
| `KC_DB_URL`      | `jdbc:postgresql://ep-xxxx-123456.us-east-1.aws.neon.tech/keycloak?sslmode=require` |
| `KC_DB_USERNAME` | `USER`                                                           |
| `KC_DB_PASSWORD` | `PASSWORD`                                                       |

> Fíjate: `KC_DB_URL` lleva el prefijo **`jdbc:`** y NO incluye usuario/contraseña.

---

## Paso 2 — Subir los archivos nuevos al repo

Ya creé `keycloak/Dockerfile`. Súbelo a GitHub (Koyeb construye desde el repo):

```bash
git add keycloak/Dockerfile keycloak/DEPLOY-KOYEB.md
git commit -m "Keycloak: imagen Docker para despliegue en Koyeb"
git push
```

---

## Paso 3 — Crear el servicio en Koyeb

1. https://app.koyeb.com → **Create Service** → **GitHub** → elige el repo.
2. Configuración del build:
   - **Builder:** `Dockerfile`
   - **Work directory / Build context:** `keycloak`
   - **Dockerfile location:** `keycloak/Dockerfile`
3. **Instance:** `Free` (eco / 512 MB).
4. **Port (exposed):** `8080`  *(Keycloak escucha ahí por defecto).*
5. **Health check:** tipo **TCP** en el puerto `8080` (deja el default; NO uses HTTP `/`).
6. Las **variables de entorno** las pones en el Paso 4.
7. Despliega. Koyeb te asigna una URL pública del tipo:
   ```
   https://caritas-keycloak-TUORG.koyeb.app
   ```
   👉 **Anota esa URL**, la necesitas en `KC_HOSTNAME` y en Vercel.

---

## Paso 4 — Variables de entorno en Koyeb (servicio Keycloak)

```
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://ep-xxxx.us-east-1.aws.neon.tech/keycloak?sslmode=require
KC_DB_USERNAME=USER
KC_DB_PASSWORD=PASSWORD
KC_DB_POOL_MAX_SIZE=10

# URL pública del servicio Koyeb (la del Paso 3). SIN slash final.
KC_HOSTNAME=https://caritas-keycloak-TUORG.koyeb.app

# Está detrás del balanceador de Koyeb (TLS termina en el edge):
KC_HTTP_ENABLED=true
KC_PROXY_HEADERS=xforwarded
KC_HEALTH_ENABLED=true

# Admin inicial de Keycloak (consola /admin). Usa una contraseña FUERTE.
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=PON-UNA-CLAVE-FUERTE

# Ajuste de memoria para caber en 512 MB (clave para que no haga OOM):
JAVA_OPTS_KC_HEAP=-Xms48m -Xmx320m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=160m
```

> Al añadir `KC_HOSTNAME` quizá tengas que **redeploy** para que tome efecto.

Cuando el deploy quede verde, abre `https://...koyeb.app/admin` y entra con
`admin` / la clave que pusiste. Deberías ver el realm **caritas** ya importado.

---

## Paso 5 — Registrar la URL de Vercel en el cliente `caritas-app`

El realm importado trae solo `http://localhost:3000` como redirect. Hay que
añadir tu dominio de Vercel o el login fallará con *Invalid redirect URI*.

En la consola de Keycloak:

1. Realm **caritas** → **Clients** → `caritas-app` → pestaña **Settings**.
2. **Valid redirect URIs** → añade:
   ```
   https://TU-APP.vercel.app/*
   ```
3. **Valid post logout redirect URIs** → añade:
   ```
   https://TU-APP.vercel.app/*
   ```
4. **Web origins** → añade:
   ```
   https://TU-APP.vercel.app
   ```
5. **Save**.

### (Recomendado) Cambiar el client secret
El realm trae el secret de dev `caritas-app-secret-dev`. En producción:
1. `caritas-app` → pestaña **Credentials** → **Regenerate** secret → cópialo.
2. Lo usarás como `AUTH_KEYCLOAK_SECRET` en Vercel (Paso 6).

---

## Paso 6 — Variables de entorno en Vercel (la app)

En el proyecto de Vercel → **Settings → Environment Variables** (Production):

```
AUTH_SECRET=<genera con: openssl rand -base64 32>
AUTH_URL=https://TU-APP.vercel.app
AUTH_TRUST_HOST=true

AUTH_KEYCLOAK_ID=caritas-app
AUTH_KEYCLOAK_SECRET=<el client secret de Keycloak>
AUTH_KEYCLOAK_ISSUER=https://caritas-keycloak-TUORG.koyeb.app/realms/caritas

# Admin API (para crear usuarios/brigadistas desde la app):
KEYCLOAK_ADMIN_URL=https://caritas-keycloak-TUORG.koyeb.app
KEYCLOAK_REALM=caritas
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASS=<la misma clave del KC_BOOTSTRAP_ADMIN_PASSWORD>
```

> ❌ **NO** definas `AUTH_KEYCLOAK_INTERNAL_URL` en Vercel. Esa variable solo
> servía para la red interna de Docker en local; en Vercel→Koyeb todo es por la
> URL pública. Si la pones, el intercambio del token fallará.

Después de guardar, **redeploy** la app en Vercel para que tome las variables.

---

## Paso 7 — Probar

1. Entra a `https://TU-APP.vercel.app/login`.
2. Te redirige a Keycloak (con el tema Cáritas) → inicia sesión.
3. Vuelve a la app autenticado. El puente de identidad crea/sincroniza el
   usuario en la BD de la app automáticamente.
4. Prueba crear un usuario/brigadista desde la app → debe aparecer en Keycloak
   (**Users**) y en la BD.

---

## El punto débil del plan free (recuérdalo)

- **Koyeb free puede dormir** por inactividad → el primer login tras un rato
  tarda ~30–60 s (arranque de la JVM). Con uso seguido en horario laboral casi
  no se nota; si molesta, migrar a Oracle Cloud Always Free (no se duerme).
- **Neon free autosuspende** la BD a los ~5 min de inactividad; reconecta solo,
  pero suma algo de latencia al primer request.
- **512 MB:** ya está ajustado con `JAVA_OPTS_KC_HEAP`. Evita importar cientos
  de usuarios de golpe; crearlos de a pocos va perfecto.

---

## Checklist rápido

- [ ] BD `keycloak` creada en Neon, connection string a la mano
- [ ] `keycloak/Dockerfile` subido a GitHub
- [ ] Servicio Koyeb creado (build context `keycloak`, puerto 8080, health TCP)
- [ ] Variables de Koyeb puestas (incluido `KC_HOSTNAME` con la URL real)
- [ ] Login admin OK en `…koyeb.app/admin`, realm `caritas` visible
- [ ] Redirect URIs + Web origins de `caritas-app` con la URL de Vercel
- [ ] (Opcional) client secret regenerado
- [ ] Variables de Vercel puestas (sin `AUTH_KEYCLOAK_INTERNAL_URL`)
- [ ] Redeploy de Vercel y login probado de punta a punta
