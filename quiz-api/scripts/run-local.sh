#!/usr/bin/env bash
# Oracle credentials: application-local.properties; Google credentials: application-oauth2.properties.
set +x
set -euo pipefail

backend_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workspace_dir="$(dirname "$backend_dir")"
case "${1:-}" in
  '') export APP_OAUTH2_ENABLED=true; export SPRING_PROFILES_ACTIVE=local,oauth2 ;;
  --no-oauth) export APP_OAUTH2_ENABLED=false; export SPRING_PROFILES_ACTIVE=local,no-oauth ;;
  *) echo 'Usage: ./scripts/run-local.sh [--no-oauth]' >&2; exit 1 ;;
esac

if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/opt/jdk-17.0.20.1+1/Contents/Home" ]; then
  export JAVA_HOME="$HOME/.local/opt/jdk-17.0.20.1+1/Contents/Home"
fi
if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi
export ORACLE_TNS_ADMIN="${ORACLE_TNS_ADMIN:-$workspace_dir/wallet_quizdb}"
export TNS_ADMIN="$ORACLE_TNS_ADMIN"
if [ ! -f "$ORACLE_TNS_ADMIN/tnsnames.ora" ]; then
  echo "Wallet missing tnsnames.ora: $ORACLE_TNS_ADMIN" >&2; exit 1
fi

cd "$backend_dir"
exec ./mvnw -B spring-boot:run
