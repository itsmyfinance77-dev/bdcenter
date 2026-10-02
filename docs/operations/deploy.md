# Deploying the site (Docker + HTTPS)

Architecture: [ADR-0004](../decisions/ADR-0004-deployment-and-operations.md).
Backups and restore: [backup.md](backup.md).

## What the server needs

- Linux with Docker Engine and the Compose plugin (`docker compose version`).
  2 vCPU / 4 GB RAM is plenty; the image build is the heaviest step.
- A DNS **A record** for the site name (e.g. `bdcenter.yazdccima.com`) pointing
  at the server's public IP (OQ-BD-08: whoever manages `yazdccima.com` adds it).
- Ports **80 and 443** open to the internet (80 is needed for the certificate
  challenge and the redirect to HTTPS).

## First install

```sh
git clone https://github.com/itsmyfinance77-dev/bdcenter.git && cd bdcenter
cp deploy/env.production.example .env.production
chmod 600 .env.production
# Fill in every value; generate secrets with the openssl commands shown there.
nano .env.production

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

On the first start `migrate` creates the schema, `app` starts, and Caddy asks
for a certificate (it retries on its own if DNS is not ready yet; see
`docker compose ... logs caddy`).

Create the first admin account. Without `ADMIN_PASSWORD` a password is
generated and printed once; note it down:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate \
  node_modules/.bin/tsx scripts/create-admin.ts --email you@example.com --name "Full Name"
```

Then sign in at `https://<domain>/admin`, open **حساب من و امنیت** and turn on
two-step login.

To avoid repeating the flags, export them once per shell:

```sh
export COMPOSE_FILE=docker-compose.prod.yml COMPOSE_ENV_FILES=.env.production
docker compose ps
```

## Updating

```sh
git pull
docker compose up -d --build   # with the exports above
```

`migrate` applies new migrations before the new `app` starts. Take a manual
backup first for large updates (see backup.md).

## Checks after a deploy

- `https://<domain>/api/health` returns `{"ok":true}`.
- The response headers include `Strict-Transport-Security`.
- `/admin/system` shows no new errors and a recent backup (the first one runs
  at `BACKUP_AT`, or run one by hand).
- Member sign-in sends an SMS (needs `SMS_PROVIDER` and keys, OQ-BD-11).

## Notes

- `NEXT_PUBLIC_SITE_URL` is compiled into the image: after changing it, rebuild
  (`up -d --build`).
- Only Caddy is reachable from outside. The database has no published port; to
  inspect it: `docker compose exec db psql -U bdcenter bdcenter`.
- Logs: `docker compose logs -f app` (server errors are also listed in
  `/admin/system`, and emailed to `ERROR_ALERT_EMAIL`).
- Uploaded files live in the `storage` volume, certificates in `caddy-data`.
  Never run `docker compose down -v`: `-v` deletes the volumes, i.e. the
  database, the uploads and the backups.
- The plain-HTTP LAN preview (`npm run preview`) is for viewing on a local
  network only; it is not this setup.
