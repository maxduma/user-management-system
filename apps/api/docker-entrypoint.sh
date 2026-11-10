#!/bin/sh
# Applies pending migrations (and optionally demo data) before starting the API.
set -e

prisma migrate deploy

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  node dist/seed.js
fi

exec "$@"
