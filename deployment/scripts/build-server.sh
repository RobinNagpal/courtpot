#!/usr/bin/env bash
# Bundles apps/server into deployment/dist/server/, which the deploy workflow
# rsyncs to /srv/courtpot/current on the shared host and runs under systemd as
# courtpot-api. Run from anywhere; requires pnpm.
#
# Output is a directory rather than a zip because the deploy is an rsync: only
# changed files cross the wire, and there is nothing on the far side to unpack.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
out="$root/deployment/dist/server"
# Ubuntu 24.04 on x86_64, which is what Lightsail runs. This is the one thing
# that has to track the host image: an engine built for the wrong libc or
# OpenSSL fails at the first query, not at start-up.
engine_name="libquery_engine-debian-openssl-3.0.x.so.node"

rm -rf "$out"
mkdir -p "$out"

cd "$root"
pnpm --filter server exec prisma generate

# CJS on purpose, and the reason src/index.ts keeps its bootstrap inside a
# function: the generated Prisma client is CommonJS and requires its engine at
# runtime, which an ESM bundle cannot express.
pnpm --filter server exec esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile="$out/index.js" \
  --minify-syntax \
  --log-level=warning

# The bundled Prisma client resolves its query engine relative to the bundle, so
# the engine has to sit next to index.js rather than anywhere in node_modules.
engine="$(find "$root/node_modules/.prisma" "$root/apps/server/node_modules" "$root/node_modules/.pnpm" \
  -name "$engine_name" -not -path "*/.cache/*" 2>/dev/null | head -1)"
if [[ -z "$engine" ]]; then
  echo "error: $engine_name not found — is it still in schema.prisma's binaryTargets?" >&2
  exit 1
fi
cp "$engine" "$out/"
cp "$root/apps/server/prisma/schema.prisma" "$out/"

echo "Built $(du -sh "$out" | cut -f1) in deployment/dist/server:"
ls -1 "$out"
