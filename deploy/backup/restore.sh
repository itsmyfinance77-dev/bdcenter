#!/bin/sh
# Restores backups made by backup.sh; see docs/operations/backup.md.
#
#   CONFIRM_RESTORE=yes sh restore.sh /backups/db-20261002-003000.dump
#   CONFIRM_RESTORE=yes sh restore.sh /backups/files-20261002-003000.tar.gz
#
# Each argument is restored by its kind (file name):
#   db-*.dump      DESTRUCTIVE: replaces every table of DATABASE_URL, in one
#                  transaction (on any error the database is left as it was).
#                  Stop the app first.
#   files-*.tar.gz extracted over STORAGE_DIR (same names replaced, newer
#                  files kept; owners preserved).
set -eu

STORAGE_DIR="${STORAGE_DIR:-/storage}"

if [ $# -lt 1 ]; then
  echo "usage: CONFIRM_RESTORE=yes sh restore.sh <db-*.dump | files-*.tar.gz>..." >&2
  exit 2
fi
if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Restoring overwrites data. Set CONFIRM_RESTORE=yes to go ahead." >&2
  exit 2
fi

for file in "$@"; do
  case "$(basename "$file")" in
    db-*.dump)
      : "${DATABASE_URL:?DATABASE_URL is required to restore the database}"
      pg_restore --list "$file" > /dev/null
      pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction \
        --exit-on-error --dbname="${DATABASE_URL%%\?*}" "$file"
      echo "database restored from $file"
      ;;
    files-*.tar.gz)
      mkdir -p "$STORAGE_DIR"
      tar -xzf "$file" -C "$STORAGE_DIR"
      echo "files restored from $file into $STORAGE_DIR"
      ;;
    *)
      echo "not a backup file: $file" >&2
      exit 2
      ;;
  esac
done
