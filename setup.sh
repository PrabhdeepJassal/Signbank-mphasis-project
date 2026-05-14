#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# SignBank Enterprise — Setup Script
# Usage:  bash setup.sh
# ──────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Prerequisites ────────────────────────────────────────────────────────────

check_dep() {
  if ! command -v "$1" &>/dev/null; then
    err "$1 is not installed. Please install it first."
    exit 1
  fi
  ok "$1 found: $(command -v "$1")"
}

info "Checking prerequisites..."
check_dep node
check_dep java
check_dep docker

NODE_OK=$(node -e "console.log(process.version.slice(1).split('.')[0] >= 18)")
JAVA_OK=$(java -version 2>&1 | grep -c 'version "21')
[[ "$NODE_OK" == "true" ]] && ok "Node.js >= 18" || { err "Node.js >= 18 required"; exit 1; }
[[ "$JAVA_OK" -gt 0 ]] && ok "Java 21 detected" || { err "Java 21 required"; exit 1; }

# ── Copy .env if missing ─────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  info "Created .env from .env.example — edit if needed"
fi
source .env 2>/dev/null || true

# ── Start PostgreSQL ─────────────────────────────────────────────────────────
info "Starting PostgreSQL via Docker..."
if docker ps --format '{{.Names}}' | grep -q '^signbank-db$'; then
  ok "PostgreSQL container already running"
else
  docker compose up -d postgres
  ok "PostgreSQL container started"
fi

# ── Wait for DB ──────────────────────────────────────────────────────────────
info "Waiting for PostgreSQL to be healthy..."
for i in $(seq 1 30); do
  if docker exec signbank-db pg_isready -U postgres &>/dev/null; then
    ok "PostgreSQL is ready"
    break
  fi
  sleep 1
done

# ── Frontend ─────────────────────────────────────────────────────────────────
info "Installing frontend dependencies..."
cd frontend
npm install
ok "Frontend dependencies installed"
cd ..

# ── Backend ──────────────────────────────────────────────────────────────────
info "Building backend..."
cd backend
./mvnw clean package -DskipTests -q
ok "Backend built successfully"
cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          SignBank Enterprise — Setup Complete           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Start the backend:"
echo "    cd backend && ./mvnw spring-boot:run"
echo ""
echo "  Start the frontend (in another terminal):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Or run everything with Docker Compose:"
echo "    docker compose up --build"
echo ""
echo "  Open the app:  http://localhost:5173"
echo ""
