#!/usr/bin/env bash
# ============================================================
# build.sh — Render.com build script
# Runs once during deployment:
#   1. Install Python packages
#   2. Build React frontend
#   3. Copy React build into Django static folder
#   4. Collect all static files
#   5. Run database migrations
# ============================================================

set -o errexit   # Stop on any error

# ── 1. Python dependencies ───────────────────────────────────
pip install -r backend/requirements.txt

# ── 2. React build ───────────────────────────────────────────
cd frontend
npm install
CI=false npm run build
cd ..

# ── 3. Copy React build → Django can serve it ────────────────
mkdir -p backend/frontend_build
cp -r frontend/build/. backend/frontend_build/

# ── 4. Collect Django static files (CSS/JS for admin etc.) ───
cd backend
python manage.py collectstatic --no-input

# ── 5. Run database migrations ───────────────────────────────
python manage.py migrate
