#!/bin/sh
# One backup run: the database (pg_dump custom format, verified with
# pg_restore --list) and the uploaded files (tar.gz of STORAGE_DIR), then
# rotation that keeps the newest BACKUP_KEEP of each kind.
#
# Files are written under a temporary name and renamed only when complete, so
# a half-written backup never looks like a good one. A failed run leaves
# last-failure.txt, which the admin panel shows (/admin/system); the next
# successful run removes it.
#
# Environment: DATABASE_URL (required), BACKUP_DIR (/backups),
# STORAGE_DIR (/storage), BACKUP_KEEP (14).
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STORAGE_DIR="${STORAGE_DIR:-/storage}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
: "${DATABASE_URL:?DATABASE_URL is required}"

# Prisma's ?schema=public is not a libpq parameter; pg_dump would refuse it.
db_url="${DATABASE_URL%%\?*}"
stamp="$(date -u +%Y%m%d-%H%M%S)"
partial="$BACKUP_DIR/.partial-$stamp"
log="$partial/log.txt"

fail() {
  message="$(date -u '+%Y-%m-%d %H:%M:%S UTC') $1"
  if [ -f "$log" ]; then message="$message: $(tail -n 3 "$log" | tr '\n' ' ')"; fi
  echo "backup failed: $message" >&2
  printf '%s\n' "$message" > "$BACKUP_DIR/last-failure.txt"
  rm -rf "$partial"
  exit 1
}

# Leftovers of a run that was killed half-way (only one run happens at a time).
rm -rf "$BACKUP_DIR"/.partial-*
mkdir -p "$partial" || { echo "cannot write to $BACKUP_DIR" >&2; exit 1; }
: > "$log"

pg_dump --format=custom --no-owner --no-privileges --file="$partial/db.dump" "$db_url" 2>> "$log" \
  || fail "database dump"
pg_restore --list "$partial/db.dump" > /dev/null 2>> "$log" || fail "pg_restore --list (dump unreadable)"

if [ -d "$STORAGE_DIR" ]; then
  tar -czf "$partial/files.tar.gz" -C "$STORAGE_DIR" . 2>> "$log" || fail "tar $STORAGE_DIR"
else
  fail "STORAGE_DIR $STORAGE_DIR does not exist"
fi

mv "$partial/db.dump" "$BACKUP_DIR/db-$stamp.dump"
mv "$partial/files.tar.gz" "$BACKUP_DIR/files-$stamp.tar.gz"
rm -rf "$partial"
rm -f "$BACKUP_DIR/last-failure.txt"

# Rotation by count, never by age: if backups stop for a while, the last good
# copies are kept. Names sort by time (UTC stamp).
for prefix in db files; do
  ls -1 "$BACKUP_DIR" | grep -E "^$prefix-[0-9]{8}-[0-9]{6}\." | sort -r | tail -n +"$((BACKUP_KEEP + 1))" \
    | while read -r old; do rm -f "$BACKUP_DIR/$old"; done
done

echo "backup ok: db-$stamp.dump ($(du -h "$BACKUP_DIR/db-$stamp.dump" | cut -f1)), files-$stamp.tar.gz ($(du -h "$BACKUP_DIR/files-$stamp.tar.gz" | cut -f1))"
