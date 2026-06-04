# Despliegue en producción — Cáritas GRD

Arquitectura: **Docker Compose + Caddy (HTTPS automático)**, con la BD de la app en
**AWS RDS** y los archivos en **Amazon S3** (ambos externos al servidor).

```
Internet ──HTTPS──> Caddy ──┬── app.tudominio.com  → web (Next.js standalone)
                            └── auth.tudominio.com → keycloak
   web ──> RDS (app)   keycloak ──> keycloak-db   web ──> S3 / RENIEC / SMTP
```

## Requisitos
- Un servidor Linux con Docker + Docker Compose (EC2, Lightsail, VPS…).
- Dos subdominios apuntando (DNS A) a la IP del servidor: `app.tudominio.com` y `auth.tudominio.com`.
- Puertos **80** y **443** abiertos.
- AWS RDS PostgreSQL accesible desde el servidor (security group) y bucket S3.

## 1. Preparar variables
```bash
cp .env.production.example .env.production
# edita .env.production con tus valores reales (RDS, AUTH_SECRET, Keycloak, S3, RENIEC, SMTP)
openssl rand -base64 32   # para AUTH_SECRET
chmod 600 .env.production  # nunca se sube a git
```

## 2. Dominios
- En `Caddyfile`: reemplaza `app.tudominio.com` y `auth.tudominio.com` por los tuyos.
- En `.env.production`: `AUTH_URL`, `AUTH_KEYCLOAK_ISSUER`, `KC_HOSTNAME`, `APP_URL` deben usar esos dominios.

## 3. Keycloak (realm)
El realm se importa al primer arranque desde `keycloak/realm-caritas.json`. Para producción,
edita ese archivo (o hazlo luego en la consola `https://auth.tudominio.com/admin`):
- **Redirect URIs** del client `caritas-app`: `https://app.tudominio.com/*`
- **Web origins**: `https://app.tudominio.com`
- **post.logout.redirect.uris**: `https://app.tudominio.com/*`
- Cambia el **client secret** y ponlo en `AUTH_KEYCLOAK_SECRET`.

## 4. Esquema de la BD (una vez)
Como la app usa el adaptador PrismaPg, aplica el esquema a RDS:
```bash
# desde un entorno con las deps (o el contenedor de dev) y DATABASE_URL apuntando a RDS:
npx prisma db push
# y los catálogos de artículos de kits:
npx tsx prisma/seed-kits.ts
```

## 5. Levantar
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
Caddy obtiene los certificados TLS automáticamente. Verifica:
- App:      https://app.tudominio.com
- Keycloak: https://auth.tudominio.com/admin

## 6. S3 (CORS)
En el bucket → Permissions → CORS:
```json
[{ "AllowedOrigins": ["https://app.tudominio.com"], "AllowedMethods": ["PUT","GET"], "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"] }]
```
Recomendado en AWS: usar un **IAM Role** del servidor en vez de llaves estáticas.

## Operación
```bash
# logs
docker compose -f docker-compose.prod.yml logs -f web
# actualizar tras un cambio de código
git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web
# backups: RDS automático (app) + dump de keycloak-db
docker compose -f docker-compose.prod.yml exec keycloak-db pg_dump -U keycloak keycloak > keycloak_backup.sql
```

## Notas
- `Dockerfile` usa valores DUMMY de `DATABASE_URL`/`AUTH_SECRET` **solo durante el build**
  (Next importa los módulos al compilar). En runtime mandan los de `.env.production`.
- Keycloak corre con `start` (no `--optimized`): hace un build ligero al arrancar. Para
  arranques más rápidos se puede prehornear una imagen con `kc.sh build`.
- Para escalar: este mismo `web` se puede llevar a AWS ECS/Fargate detrás de un ALB+ACM,
  con RDS y S3 que ya usas.
