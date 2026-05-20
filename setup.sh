#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  info "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && ok "Backend stopped"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "Frontend stopped"
  exit 0
}
trap cleanup SIGINT SIGTERM

detect_os() {
  case "$(uname -s)" in
    Darwin*)  echo 'macOS' ;;
    Linux*)   echo 'Linux' ;;
    *)        err "Unsupported OS"; exit 1 ;;
  esac
}

install_if_missing() {
  local cmd="$1" pkg="$2"
  if ! command -v "$cmd" &>/dev/null; then
    warn "$cmd not found — installing $pkg..."
    case "$(detect_os)" in
      macOS) brew install "$pkg" ;;
      Linux) sudo apt-get install -y "$pkg" ;;
    esac
    ok "$pkg installed"
  else
    ok "$cmd found"
  fi
}

ensure_postgres_running() {
  if pg_isready -q 2>/dev/null; then
    ok "PostgreSQL is running"
    return
  fi
  info "Starting PostgreSQL..."
  case "$(detect_os)" in
    macOS)
      if brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null; then
        ok "PostgreSQL started"
      else
        err "Could not start PostgreSQL. Start it manually."
        exit 1
      fi
      ;;
    Linux)
      sudo service postgresql start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || {
        err "Could not start PostgreSQL. Start it manually."
        exit 1
      }
      ok "PostgreSQL started"
      ;;
  esac
  sleep 2
}

create_database() {
  if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw signbank_db; then
    ok "Database 'signbank_db' already exists"
  else
    info "Creating database 'signbank_db'..."
    createdb signbank_db 2>/dev/null && ok "Database created" || {
      warn "Could not create database with createdb — trying via psql..."
      psql -c "CREATE DATABASE signbank_db;" && ok "Database created" || err "Could not create database"
    }
  fi
}

# ── STEP 1: Install missing prerequisites ──
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    SignBank Enterprise — Auto Pilot Setup               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

info "Checking and installing prerequisites..."
case "$(detect_os)" in
  macOS)
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found — installing it first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    install_if_missing node node
    install_if_missing java openjdk@21
    install_if_missing psql postgresql@16
    install_if_missing createdb postgresql@16
    ;;
  Linux)
    sudo apt-get update -qq
    install_if_missing node nodejs
    install_if_missing java openjdk-21-jdk
    install_if_missing psql postgresql
    install_if_missing createdb postgresql-client
    ;;
esac

# Version checks
info "Verifying versions..."
NODE_OK=$(node -e "console.log(process.version.slice(1).split('.')[0] >= 18)")
JAVA_OK=$(java -version 2>&1 | grep -c 'version "21')
[[ "$NODE_OK" == "true" ]] && ok "Node.js >= 18" || { warn "Node.js may need upgrade (found: $(node --version))"; }
[[ "$JAVA_OK" -gt 0 ]] && ok "Java 21 detected" || { warn "Java version may not be 21 (found: $(java --version 2>&1 | head -1))"; }

# ── STEP 2: Ensure PostgreSQL is running ──
ensure_postgres_running

# ── STEP 3: Create database ──
create_database

# ── STEP 4: Build backend ──
echo ""
info "Building backend..."
cd "$SCRIPT_DIR/backend"
./mvnw clean package -DskipTests -q
ok "Backend built"

# ── STEP 5: Install frontend deps ──
info "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
ok "Frontend dependencies installed"

# ── STEP 6: Launch everything ──
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Starting Services...                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"

cd "$SCRIPT_DIR/backend"
./mvnw spring-boot:run -q &
BACKEND_PID=$!
info "Backend starting on http://localhost:8080 (PID: $BACKEND_PID)"

sleep 5

cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
info "Frontend starting on http://localhost:5173 (PID: $FRONTEND_PID)"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓  SignBank Enterprise is running!                      ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:5173                        ║${NC}"
echo -e "${GREEN}║  Backend:   http://localhost:8080                        ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"

wait
