#!/bin/sh
set -eu
umask 077

wallet_secret="${WALLET_SECRET_FILE:-/etc/secrets/wallet.zip.b64}"
wallet_dir="${ORACLE_TNS_ADMIN:-/tmp/quizz-app-wallet}"
if [ -f "$wallet_secret" ]; then
  mkdir -p "$wallet_dir"
  base64 -d < "$wallet_secret" > "$wallet_dir/wallet.zip"
  unzip -q -o "$wallet_dir/wallet.zip" -d "$wallet_dir"
  if [ ! -f "$wallet_dir/cwallet.sso" ] || [ ! -f "$wallet_dir/tnsnames.ora" ]; then
    echo 'Wallet must contain cwallet.sso and tnsnames.ora at its root.' >&2
    exit 1
  fi
  # Use the runtime directory instead of the downloaded wallet's local path.
  printf 'oracle.net.wallet_location=(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=%s)))\n' "$wallet_dir" > "$wallet_dir/ojdbc.properties"
  printf 'WALLET_LOCATION=(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY="%s")))\nSSL_SERVER_DN_MATCH=yes\n' "$wallet_dir" > "$wallet_dir/sqlnet.ora"
fi
export ORACLE_TNS_ADMIN="$wallet_dir"
export TNS_ADMIN="$wallet_dir"

# Wallet-less TLS can also be used by supplying a complete Oracle DB_URL.
exec java -jar /app/app.jar
