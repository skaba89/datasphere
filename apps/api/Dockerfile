FROM node:22-alpine AS builder

WORKDIR /monorepo

# Manifests du workspace
COPY package*.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package*.json ./apps/api/

# Installation de toutes les dépendances workspace
RUN npm ci

# Schéma Prisma + génération du client dans packages/database/generated/
COPY packages/database/prisma ./packages/database/prisma
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma

# Compilation de l'API NestJS
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
RUN cd apps/api && npx nest build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /monorepo

ENV NODE_ENV=production

COPY --from=builder /monorepo/node_modules ./node_modules
COPY --from=builder /monorepo/packages/database/generated ./packages/database/generated
COPY --from=builder /monorepo/packages/database/package.json ./packages/database/
COPY --from=builder /monorepo/apps/api/dist ./apps/api/dist
COPY --from=builder /monorepo/apps/api/package*.json ./apps/api/

WORKDIR /monorepo/apps/api

EXPOSE 4000

CMD ["node", "dist/main"]
