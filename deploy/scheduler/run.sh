#!/bin/sh
# Entry point of the scheduler container: calls the site's scheduled jobs over
# the internal network every SCHEDULER_INTERVAL seconds (default 900 = 15 min).
# Today the only job is the reminder SMS (/api/cron/reminders). A plain loop
# instead of cron, so it logs to the container's output like the backup job.
set -u

APP_URL="${APP_URL:-http://app:3000}"
INTERVAL="${SCHEDULER_INTERVAL:-900}"

if [ "${#CRON_SECRET}" -lt 32 ]; then
  echo "CRON_SECRET must be set (at least 32 characters); scheduler idle" >&2
  while true; do sleep 3600; done
fi

case "$INTERVAL" in
  '' | *[!0-9]*) echo "SCHEDULER_INTERVAL must be a number of seconds" >&2; exit 1 ;;
esac

# Give the app time to start after a deploy.
sleep "${SCHEDULER_START_DELAY:-60}"
while true; do
  printf '%s reminders: ' "$(date -u '+%Y-%m-%d %H:%M UTC')"
  wget -q -O - -T 120 \
    --header "Authorization: Bearer $CRON_SECRET" \
    --post-data '' \
    "$APP_URL/api/cron/reminders" || printf 'call failed'
  echo
  sleep "$INTERVAL"
done
