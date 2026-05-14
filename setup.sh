#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

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
check_dep psql

NODE_OK=$(node -e "console.log(process.version.slice(1).split('.')[0] >= 18)")
JAVA_OK=$(java -version 2>&1 | grep -c 'version "21')
[[ "$NODE_OK" == "true" ]] && ok "Node.js >= 18" || { err "Node.js >= 18 required"; exit 1; }
[[ "$JAVA_OK" -gt 0 ]] && ok "Java 21 detected" || { err "Java 21 required"; exit 1; }

info "Installing frontend dependencies..."
cd frontend
npm install
ok "Frontend dependencies installed"
cd ..

info "Building backend..."
cd backend
./mvnw clean package -DskipTests -q
ok "Backend built successfully"
cd ..

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          SignBank Enterprise — Setup Complete           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Make sure PostgreSQL is running with database 'signbank_db'."
echo ""
echo "  Start the backend:"
echo "    cd backend && ./mvnw spring-boot:run"
echo ""
echo "  Start the frontend (in another terminal):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Open the app:  http://localhost:5173"
echo ""
