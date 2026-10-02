# Backups and restore

The `backup` service of `docker-compose.prod.yml` runs
[`deploy/backup/backup.sh`](../../deploy/backup/backup.sh) every day at
`BACKUP_AT` (UTC, default `00:30` = 04:00 Tehran). Each run writes, into the
`backups` volume:

- `db-YYYYMMDD-HHMMSS.dump` — the whole database (`pg_dump` custom format),
  checked readable with `pg_restore --list` before it counts;
- `files-YYYYMMDD-HHMMSS.tar.gz` — the uploaded files (`storage` volume).

The newest `BACKUP_KEEP` (default 14) of each are kept. If a run fails,
`last-failure.txt` says why and **وضعیت سامانه** (`/admin/system`) shows it; the
panel also warns when the newest database backup is more than 36 hours old.

These copies sit on the same server. Copy them elsewhere regularly
(OQ-BD-19), for example:

```sh
docker run --rm -v bdcenter_backups:/b alpine tar -C /b -cf - . > bdcenter-backups.tar
```

(The volume name is `<project folder>_backups`; see `docker volume ls`.)

## Backup now

```sh
docker compose exec backup sh /backup/backup.sh
docker compose exec backup ls -l /backups
```

## Restore

Restoring **replaces every table**. It runs in one transaction: if it fails,
the database stays as it was.

```sh
docker compose stop app
docker compose exec backup ls -l /backups

# 1. The database (the backup service already has DATABASE_URL).
docker compose exec -e CONFIRM_RESTORE=yes backup \
  sh /backup/restore.sh /backups/db-20261002-003000.dump

# 2. The files. The backup service mounts storage read-only, so use a
#    throw-away container with a writable mount (volume names: docker volume ls).
docker run --rm -e CONFIRM_RESTORE=yes \
  -v "$PWD/deploy/backup:/backup:ro" -v bdcenter_backups:/backups:ro -v bdcenter_storage:/storage \
  postgres:16-alpine sh /backup/restore.sh /backups/files-20261002-003000.tar.gz

docker compose start app
```

Files are extracted over the existing ones with their owners preserved; files
uploaded after the backup stay (they are just no longer referenced).

To restore onto a new server: install as in deploy.md, copy the two backup
files into the new `backups` volume, then run the restore above.

## Tested

On 2026-10-02 against the development database: three runs with
`BACKUP_KEEP=2` kept the newest two of each kind; a restore into an empty
database reproduced all 25 tables with the same row counts; a run against a
missing database exited 1, wrote `last-failure.txt` and left no partial files;
the scheduler rejects an invalid `BACKUP_AT` and computes the next run time.
