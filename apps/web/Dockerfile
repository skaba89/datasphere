FROM node:22-alpine AS builder

WORKDIR /monorepo

# Manifests workspace (root lock file + app package.json)
COPY package*.json ./
COPY apps/web/package.json ./apps/web/

# Installation des dépendances avec le lock file racine
RUN npm ci --workspace=apps/web --include-workspace-root

# Sources Next.js
COPY apps/web/next.config.ts apps/web/tsconfig.json apps/web/tailwind.config.ts apps/web/postcss.config.js ./apps/web/
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public

WORKDIR /monorepo/apps/web

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /monorepo/apps/web/package.json ./
COPY --from=builder /monorepo/apps/web/.next ./.next
COPY --from=builder /monorepo/apps/web/public ./public
COPY --from=builder /monorepo/node_modules ./node_modules

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
