#!/bin/bash
# GuineaTender AI — Vérification de l'état de tous les services

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

OK="${GREEN}✔${NC}"
FAIL="${RED}✘${NC}"
WARN="${YELLOW}⚠${NC}"

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}   GuineaTender AI — État des services    ${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

check_port() {
  local name="$1"
  local host="$2"
  local port="$3"
  if nc -z -w2 "$host" "$port" 2>/dev/null; then
    echo -e " ${OK} ${name} — port ${port} accessible"
    return 0
  else
    echo -e " ${FAIL} ${name} — port ${port} NON accessible"
    return 1
  fi
}

check_http() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
  if [ "$response" = "$expected" ]; then
    echo -e " ${OK} ${name} — HTTP ${response}"
    return 0
  else
    echo -e " ${FAIL} ${name} — HTTP ${response:-timeout} (attendu: ${expected})"
    return 1
  fi
}

check_http_json() {
  local name="$1"
  local url="$2"
  local key="$3"
  local response
  response=$(curl -s --max-time 5 "$url" 2>/dev/null)
  if echo "$response" | grep -q "\"$key\""; then
    echo -e " ${OK} ${name} — ${response}"
    return 0
  else
    echo -e " ${FAIL} ${name} — Réponse inattendue: ${response:-timeout}"
    return 1
  fi
}

# ── Infrastructure Docker ─────────────────────────────────────────────────────
echo -e "${YELLOW}Infrastructure (Docker)${NC}"
check_port "PostgreSQL" localhost 5432
check_port "Redis     " localhost 6379
check_port "MinIO     " localhost 9000
check_port "Qdrant    " localhost 6333

echo ""

# ── API NestJS ────────────────────────────────────────────────────────────────
echo -e "${YELLOW}API NestJS (port 4000)${NC}"
if check_http "API Health" "http://localhost:4000/api/v1/health" "200"; then
  check_http_json "API→DB" "http://localhost:4000/api/v1/health" "status"
else
  echo -e " ${WARN} L'API ne répond pas — lancez: cd apps/api && npm run dev"
fi

echo ""

# ── Frontend Next.js ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Frontend Next.js (port 3000)${NC}"
if check_http "Web App" "http://localhost:3000" "200"; then
  echo -e " ${OK} Interface accessible sur http://localhost:3000"
else
  echo -e " ${WARN} Le frontend ne répond pas — lancez: cd apps/web && npm run dev"
fi

echo ""

# ── Services optionnels ───────────────────────────────────────────────────────
echo -e "${YELLOW}Services optionnels${NC}"
check_port "ClickHouse" localhost 8123
check_port "MinIO UI  " localhost 9001

echo ""

# ── Résumé Docker ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}Conteneurs Docker actifs${NC}"
docker ps --format " ${OK} {{.Names}} — {{.Status}}" 2>/dev/null | grep -E "gt_" || echo " (Docker non accessible ou aucun conteneur)"

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e " Swagger API docs : http://localhost:4000/api/docs"
echo -e " MinIO console   : http://localhost:9001"
echo -e " Qdrant UI       : http://localhost:6333/dashboard"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""
