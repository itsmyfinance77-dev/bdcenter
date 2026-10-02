#!/bin/sh
# Entry point of the backup container: runs backup.sh every day at
# BACKUP_AT (UTC, HH:MM; default 00:30 = 04:00 Tehran). A plain loop instead of
# cron, so the job sees the container's environment and logs to its output.
# BACKUP_ON_START=1 also runs one backup immediately.
set -u

BACKUP_AT="${BACKUP_AT:-00:30}"
here="$(dirname "$0")"

case "$BACKUP_AT" in
  [01][0-9]:[0-5][0-9] | 2[0-3]:[0-5][0-9]) ;;
  *) echo "BACKUP_AT must be HH:MM (UTC), got '$BACKUP_AT'" >&2; exit 1 ;;
esac

if [ "${BACKUP_ON_START:-0}" = "1" ]; then sh "$here/backup.sh"; fi

while true; do
  now="$(date -u +%s)"
  next="$(date -u -d "$BACKUP_AT" +%s)"
  if [ "$next" -le "$now" ]; then next=$((next + 86400)); fi
  echo "next backup at $(date -u -d "@$next" '+%Y-%m-%d %H:%M UTC')"
  sleep $((next - now))
  # A failure is recorded in last-failure.txt; keep the schedule running.
  sh "$here/backup.sh" || true
done
