# Muzix deploy

`muzix.kcolbchain.com` is a Next.js standalone build behind Caddy on the
shared kcolbchain VPS. There is no GitHub Action and no webhook —
deploys are triggered by SSHing into the VPS and running this script.

## Layout on the VPS

| Path | What |
|------|------|
| `/opt/muzix/` | Git checkout of `kcolbchain/muzix` (the `main` branch is prod) |
| `/opt/muzix/web/.next/standalone/` | Next.js standalone build (`server.js`) — what systemd runs |
| `/opt/muzix/web/.next/standalone/public/` | **Hand-wired** — Next.js does not copy `public/` into standalone output |
| `/opt/muzix/web/.next/standalone/web/.next/static/` | **Hand-wired** — Next.js does not copy `.next/static` into standalone output |
| `/etc/systemd/system/muzix-web.service` | systemd unit — `node /opt/muzix/web/.next/standalone/server.js` on `127.0.0.1:3700` |
| `/etc/caddy/conf.d/muzix.caddy` | Caddy reverse-proxy to `127.0.0.1:3700` |

## Deploy

```bash
ssh user@<vps-host> '/opt/muzix/deploy/deploy.sh'
```

The script:

1. `git fetch && git reset --hard origin/main` in `/opt/muzix`
2. `npm install` + `npm run build` in `/opt/muzix/web`
3. Copies `web/public/` → `web/.next/standalone/public/`
4. Copies `web/.next/static/` → `web/.next/standalone/web/.next/static/`
5. `systemctl restart muzix-web`
6. Verifies the service is active; on failure prints the last 30 journal lines and exits non-zero

## Why two hand-wired copies?

Next.js standalone output deliberately omits `public/` and
`.next/static/` to keep the standalone tarball minimal — the docs tell
you to copy them in for production. See
https://nextjs.org/docs/app/api-reference/config/next-config-js/output.

The labs (`/mixdown.html`, `/labelton.html`) live in `web/public/`, so
forgetting the public-copy step is how they 404 in prod.

## Adding new sub-routes / static assets

- Static one-pagers under `web/public/` reach prod automatically once
  this script runs.
- New Next.js routes under `web/app/` need a fresh `npm run build`,
  which the script already does.
