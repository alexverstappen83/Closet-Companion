#!/bin/sh
set -e

echo "[entrypoint] Synchronising database schema..."
npx prisma db push --skip-generate

echo "[entrypoint] Starting application..."
exec "$@"
