#!/usr/bin/env bash
# Bundles apps/server into deployment/dist/lambda.zip for the courtpot-api
# Lambda function (nodejs22.x, arm64). Run from anywhere; requires pnpm.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
out="$root/deployment/dist/lambda"
engine_name="libquery_engine-linux-arm64-openssl-3.0.x.so.node"

rm -rf "$out" "$root/deployment/dist/lambda.zip"
mkdir -p "$out"

cd "$root"
pnpm --filter server exec prisma generate

# CJS output on purpose: the zip has no package.json, so Lambda treats
# index.js as CommonJS, which matches the generated Prisma client.
pnpm --filter server exec esbuild src/lambda.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile="$out/index.js" \
  --minify-syntax \
  --log-level=warning

# The bundled Prisma client loads its query engine from the directory next to
# the bundle at runtime, so ship the Lambda-target engine alongside index.js.
engine="$(find "$root/node_modules/.prisma" "$root/apps/server/node_modules" "$root/node_modules/.pnpm" \
  -name "$engine_name" -not -path "*/.cache/*" 2>/dev/null | head -1)"
if [[ -z "$engine" ]]; then
  echo "error: $engine_name not found — did prisma generate run with the Lambda binaryTarget?" >&2
  exit 1
fi
cp "$engine" "$out/"
cp "$root/apps/server/prisma/schema.prisma" "$out/"

cd "$out"
zip -qr "$root/deployment/dist/lambda.zip" .
echo "Built $(du -h "$root/deployment/dist/lambda.zip" | cut -f1) deployment/dist/lambda.zip"
