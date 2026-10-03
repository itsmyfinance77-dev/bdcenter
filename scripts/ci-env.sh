#!/usr/bin/env sh
# Writes .env for a CI run: .env.example with fresh random secrets filled in.
# Nothing here is ever used outside the throwaway CI database.
set -eu

secret() { openssl rand -base64 "$1" | tr -d '\n/+='; }

sed \
  -e "s|^SESSION_SECRET=.*|SESSION_SECRET=\"$(secret 48)\"|" \
  -e "s|^OTP_SECRET=.*|OTP_SECRET=\"$(secret 48)\"|" \
  -e "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=\"$(openssl rand -base64 32 | tr -d '\n')\"|" \
  -e 's|^SMS_PROVIDER=.*|SMS_PROVIDER="console"|' \
  .env.example > .env

for key in SESSION_SECRET OTP_SECRET DATA_ENCRYPTION_KEY; do
  grep -q "^$key=\"..*\"" .env || { echo "ci-env: $key not set" >&2; exit 1; }
done
