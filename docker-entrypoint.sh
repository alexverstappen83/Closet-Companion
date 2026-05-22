#!/bin/sh
set -e

echo "[entrypoint] Synchronising database schema..."
node node_modules/prisma/build/index.js db push --skip-generate

echo "[entrypoint] Starting application..."
exec "$@"
