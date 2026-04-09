#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# RECRUITO AI — ONE-COMMAND SETUP SCRIPT
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "  ██████╗ ███████╗ ██████╗██████╗ ██╗   ██╗██╗████████╗ ██████╗     █████╗ ██╗"
echo "  ██╔══██╗██╔════╝██╔════╝██╔══██╗██║   ██║██║╚══██╔══╝██╔═══██╗   ██╔══██╗██║"
echo "  ██████╔╝█████╗  ██║     ██████╔╝██║   ██║██║   ██║   ██║   ██║   ███████║██║"
echo "  ██╔══██╗██╔══╝  ██║     ██╔══██╗██║   ██║██║   ██║   ██║   ██║   ██╔══██║██║"
echo "  ██║  ██║███████╗╚██████╗██║  ██║╚██████╔╝██║   ██║   ╚██████╔╝██╗██║  ██║██║"
echo ""
echo "  Production-Grade AI Hiring Platform — Local Development Setup"
echo ""

# ─── Check prerequisites ─────────────────────────────────────
info "Checking prerequisites..."

command -v docker      >/dev/null 2>&1 || error "Docker not found. Install from https://docker.com"
command -v docker-compose >/dev/null 2>&1 || error "docker-compose not found."
command -v node        >/dev/null 2>&1 || error "Node.js not found. Install v20+ from https://nodejs.org"
command -v python3     >/dev/null 2>&1 || error "Python 3 not found. Install v3.11+ from https://python.org"

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
PY_VER=$(python3 --version | sed 's/Python //' | cut -d. -f2)

[ "$NODE_VER" -lt 18 ] && error "Node.js 18+ required (found: $NODE_VER)"
[ "$PY_VER" -lt 11 ]   && error "Python 3.11+ required (found: 3.$PY_VER)"

success "Prerequisites OK (Node $NODE_VER, Python 3.$PY_VER)"

# ─── Environment file ─────────────────────────────────────────
if [ ! -f ".env" ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  warn "Edit .env and add your ANTHROPIC_API_KEY and OPENAI_API_KEY before proceeding!"
  echo ""
  echo "  Required keys:"
  echo "  ANTHROPIC_API_KEY=sk-ant-..."
  echo "  OPENAI_API_KEY=sk-..."
  echo ""
  read -p "Press ENTER after editing .env to continue..."
fi

source .env

[ -z "$ANTHROPIC_API_KEY" ] && warn "ANTHROPIC_API_KEY not set — AI parsing will fail"
[ -z "$OPENAI_API_KEY" ]    && warn "OPENAI_API_KEY not set — Embeddings will fail"

# ─── Install Node dependencies ────────────────────────────────
info "Installing backend Node.js dependencies..."
cd backend && npm install --silent && cd ..
success "Backend deps installed"

info "Installing frontend Node.js dependencies..."
cd frontend && npm install --silent && cd ..
success "Frontend deps installed"

# ─── Install Python dependencies ─────────────────────────────
info "Installing Python dependencies for AI workers..."
cd ai-services

if [ ! -d "venv" ]; then
  python3 -m venv venv
  success "Python venv created"
fi

source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
cd ..
success "Python deps installed"

# ─── Start Docker services ────────────────────────────────────
info "Starting infrastructure (Postgres + Redis + MinIO)..."
docker-compose up -d postgres redis minio
info "Waiting for Postgres to be ready..."
sleep 8

# ─── Run DB migrations ────────────────────────────────────────
info "Running database migrations..."
PGPASSWORD=recruito_secret psql \
  -h localhost -p 5432 \
  -U recruito -d recruito_dev \
  -f database/migrations/001_schema.sql \
  -f database/migrations/002_seed.sql \
  2>/dev/null || docker exec recruito_postgres psql \
    -U recruito -d recruito_dev \
    -f /docker-entrypoint-initdb.d/001_schema.sql \
    -f /docker-entrypoint-initdb.d/002_seed.sql \
    2>/dev/null || warn "Could not verify migrations (may already be applied)"

success "Database ready"

# ─── MinIO bucket setup ───────────────────────────────────────
info "Creating MinIO bucket..."
sleep 3
docker exec recruito_minio mc alias set local http://localhost:9000 recruito_minio recruito_minio_secret 2>/dev/null || true
docker exec recruito_minio mc mb local/recruito-resumes 2>/dev/null || true
success "MinIO bucket ready"

# ─── Done ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  RECRUITO AI IS READY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Start everything (Docker):"
echo "    docker-compose up"
echo ""
echo "  OR start services individually:"
echo "    Terminal 1 — Backend:    cd backend && npm run dev"
echo "    Terminal 2 — Frontend:   cd frontend && npm run dev"
echo "    Terminal 3 — Parser:     cd ai-services && source venv/bin/activate && SERVICE=parser python -m workers.parser.worker"
echo "    Terminal 4 — Embeddings: cd ai-services && source venv/bin/activate && SERVICE=embeddings python -m workers.embeddings.worker"
echo "    Terminal 5 — Scoring:    cd ai-services && source venv/bin/activate && SERVICE=scoring python -m workers.scoring.worker"
echo ""
echo "  URLs:"
echo "    Frontend:   http://localhost:3000"
echo "    Backend:    http://localhost:3001"
echo "    MinIO UI:   http://localhost:9001  (recruito_minio / recruito_minio_secret)"
echo ""
echo "  Demo login:  admin@acme.com / password123"
echo ""
