# ─── Dockerfile de PRODUCCIÓN (multi-stage, Next.js standalone) ───────────────
# Build:  docker compose -f docker-compose.prod.yml --env-file .env.production build
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# 1) Dependencias
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build (genera el cliente Prisma y compila Next)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Valores DUMMY solo para el build (Next importa los módulos al recolectar páginas).
# No conectan a nada: las páginas son dinámicas y no se ejecutan en build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV AUTH_SECRET="build-time-placeholder-secret-min-32-characters"
RUN npx prisma generate && npm run build

# 3) Runner mínimo (solo lo necesario para correr)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Esquema Prisma (por si corres `prisma db push`/`migrate deploy` desde el contenedor)
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
