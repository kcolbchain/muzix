#!/bin/bash
# =============================================================
# Muzix — prod deploy
# Runs on the VPS that serves muzix.kcolbchain.com (port 3700,
# behind Caddy). Pulls main, rebuilds the Next.js standalone,
# wires in the assets standalone doesn't bundle automatically,
# and restarts the systemd service.
#
# Usage: ssh user@<vps-host> '/opt/muzix/deploy/deploy.sh'
# =============================================================

set -euo pipefail

REPO=/opt/muzix
SERVICE=muzix-web
SUBJECT=muzix.kcolbchain.com
STANDALONE="$REPO/web/.next/standalone"

echo "==> Deploying ${SUBJECT} (origin/main → prod)..."

cd "$REPO"
git fetch origin --quiet
git reset --hard origin/main
HEAD_SHA="$(git rev-parse --short HEAD)"
echo "    Source at ${HEAD_SHA}: $(git log -1 --pretty='%s')"

cd "$REPO/web"
echo "==> npm install..."
npm install --no-audit --no-fund --prefer-offline > /dev/null

echo "==> next build..."
npm run build > /dev/null

# Next.js standalone output does NOT copy these by design — the docs
# explicitly tell you to wire them in for production. See:
# https://nextjs.org/docs/app/api-reference/config/next-config-js/output
# Both destinations are RELATIVE TO THE STANDALONE ROOT — NOT under web/.
# server.js does process.chdir(__dirname) where __dirname is the standalone
# root, then looks for `./.next/static` and `./public`. Writing them under
# `standalone/web/.next/static` (a mirror of the source layout) is wrong:
# the homepage will render but every /_next/static/* request will 404,
# silently breaking all styling.
echo "==> wiring public/ and .next/static into standalone..."
rm -rf "$STANDALONE/public"
mkdir -p "$STANDALONE/public"
cp -r "$REPO/web/public/." "$STANDALONE/public/"

rm -rf "$STANDALONE/.next/static"
cp -r "$REPO/web/.next/static" "$STANDALONE/.next/static"

echo "==> systemctl restart ${SERVICE}..."
sudo systemctl restart "$SERVICE"
sleep 2

if systemctl is-active --quiet "$SERVICE"; then
    echo "==> Deploy complete at ${HEAD_SHA}. ${SERVICE} is active."
else
    echo "!!  ${SERVICE} failed to start. Recent logs:"
    journalctl -u "$SERVICE" -n 30 --no-pager
    exit 1
fi
