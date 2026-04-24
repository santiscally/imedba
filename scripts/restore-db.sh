#!/usr/bin/env bash
#
# Restore de un backup comprimido (.sql.gz) al servicio `db` de docker compose.
# DESTRUCTIVO: borra el contenido actual de la DB y la repuebla desde el dump.
#
# Uso:
#   ./scripts/restore-db.sh /var/backups/imedba/daily/imedba-20260423-030000.sql.gz
#
# Recomendado: frenar el backend antes de correr (para no pisar writes en vuelo).
#   docker compose stop backend
#   ./scripts/restore-db.sh <archivo>
#   docker compose start backend

set -euo pipefail

if [ "${1:-}" = "" ] || [ ! -f "$1" ]; then
    echo "uso: $0 <archivo.sql.gz>" >&2
    exit 1
fi

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
POSTGRES_USER="${POSTGRES_USER:-imedba}"
POSTGRES_DB="${POSTGRES_DB:-imedba}"

dump="$1"

echo "[$(date -Iseconds)] ATENCIÓN: se va a dropear y reemplazar la DB ${POSTGRES_DB}"
echo "                   desde el archivo: ${dump}"
read -r -p "Confirmar con 'yes': " confirm
[ "${confirm}" = "yes" ] || { echo "cancelado"; exit 1; }

echo "[$(date -Iseconds)] drop + recreate DB"
docker compose -f "${COMPOSE_FILE}" exec -T db \
    psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker compose -f "${COMPOSE_FILE}" exec -T db \
    psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

echo "[$(date -Iseconds)] loading dump"
gunzip -c "${dump}" | docker compose -f "${COMPOSE_FILE}" exec -T db \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "[$(date -Iseconds)] restore ok"
