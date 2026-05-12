#!/bin/bash
# GuineaTender AI — Setup local complet (Docker Desktop)
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║   GuineaTender AI — Setup local          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── 0. Prérequis ──────────────────────────────────────────────────────────────
step "Vérification des prérequis"

command -v node  >/dev/null || fail "Node.js non installé — https://nodejs.org (v22+)"
command -v npm   >/dev/null || fail "npm non installé"
command -v docker >/dev/null || fail "Docker non installé — https://docs.docker.com/desktop/"

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
[ "$NODE_VER" -ge 18 ] || fail "Node.js v18+ requis (actuel: $(node -v))"
ok "Node.js $(node -v)"
ok "npm $(npm -v)"
ok "Docker $(docker --version | awk '{print $3}')"

# ── 1. Variables d'environnement ──────────────────────────────────────────────
step "Configuration .env"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn ".env créé depuis .env.example — pensez à ajouter vos clés API IA"
else
  ok ".env déjà présent"
fi

# ── 2. Infrastructure Docker ──────────────────────────────────────────────────
step "Démarrage de l'infrastructure Docker (PostgreSQL, Redis, MinIO, Qdrant)"

cd "$ROOT_DIR"
docker compose up -d --wait 2>/dev/null || docker-compose up -d
sleep 3
ok "Conteneurs démarrés"

# ── 3. Dépendances npm ────────────────────────────────────────────────────────
step "Installation des dépendances npm (workspace)"

npm ci --prefer-offline 2>/dev/null || npm install
ok "Dépendances installées"

# ── 4. Prisma — génération du client ─────────────────────────────────────────
step "Génération du client Prisma"

cd "$ROOT_DIR/packages/database"
DATABASE_URL=$(grep '^DATABASE_URL=' "$ROOT_DIR/.env" | cut -d= -f2-)
export DATABASE_URL
npx prisma generate
ok "Client Prisma généré"

# ── 5. Migrations / Push du schéma ───────────────────────────────────────────
step "Application du schéma base de données"

npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss
ok "Schéma appliqué"

# ── 6. Seed ──────────────────────────────────────────────────────────────────
step "Seed de la base de données (données de démo)"

npx tsx prisma/seed.ts
ok "Données de démo insérées"

# ── 7. Résumé ─────────────────────────────────────────────────────────────────
cd "$ROOT_DIR"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo "║   ✅  Setup terminé !                                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Démarrer l'API  :  npm run dev:api                  ║"
echo "║  Démarrer le Web :  npm run dev:web  (autre terminal)║"
echo "║                                                      ║"
echo "║  Frontend  →  http://localhost:3000                  ║"
echo "║  API docs  →  http://localhost:4000/api/docs         ║"
echo "║  MinIO UI  →  http://localhost:9001                  ║"
echo "║                                                      ║"
echo "║  Login démo :  admin@techguinee.gn / Admin@2026!     ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
