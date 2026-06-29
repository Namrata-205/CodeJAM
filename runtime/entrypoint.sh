#!/bin/sh
set -eu

cp -R /workspace/. /run/
cp -R /opt/frontend-node_modules /run/frontend/node_modules

cd /run/frontend
npm run build -- --base=./

mkdir -p /run/backend/frontend_dist
cp -a dist/. /run/backend/frontend_dist/

cd /run/backend
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000
