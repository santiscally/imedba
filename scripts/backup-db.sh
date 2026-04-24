#!/usr/bin/env bash
#
# Backup diario de Postgres (servicio `db` en docker compose).
# Rotación: mantiene los últimos 30 diarios + los 12 primeros-de-mes.
#
# Uso manual:
#   ./scripts/backup-db.sh
#
# Cron (en el host de producción):
#   0 3 * * * /opt/imedba/scripts/backup-db.sh >> /var/log/imedba-backup.log 2>&1
#
# Variables de entorno:
#   BACKUP_DIR     — destino (default: /var/backups/imedba)
#   COMPOSE_FILE   — ruta al docker-compose.yml (default: descubre desde el script)
#   POSTGRES_USER  — usuario de DB (default: imedba)
#   POSTGRES_DB    — nombre de DB (default: imedba)

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/imedba}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
POSTGRES_USER="${POSTGRES_USER:-imedba}"
POSTGRES_DB="${POSTGRES_DB:-imedba}"

timestamp="$(date +%Y%m%d-%H%M%S)"
day_of_month="$(date +%d)"

mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/monthly"

out_file="${BACKUP_DIR}/daily/imedba-${timestamp}.sql.gz"

echo "[$(date -Iseconds)] backup start → ${out_file}"

docker compose -f "${COMPOSE_FILE}" exec -T db \
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-privileges \
  | gzip -9 > "${out_file}"

size_mb=$(du -m "${out_file}" | cut -f1)
echo "[$(date -Iseconds)] backup ok (${size_mb} MB)"

# Si es el día 1 del mes, copiar también al directorio monthly.
if [ "${day_of_month}" = "01" ]; then
    cp "${out_file}" "${BACKUP_DIR}/monthly/imedba-$(date +%Y%m).sql.gz"
    echo "[$(date -Iseconds)] monthly snapshot creado"
fi

# Rotación: borra backups diarios > 30 días y mensuales > 365 días.
find "${BACKUP_DIR}/daily"   -name 'imedba-*.sql.gz' -type f -mtime +30  -delete
find "${BACKUP_DIR}/monthly" -name 'imedba-*.sql.gz' -type f -mtime +365 -delete

echo "[$(date -Iseconds)] backup done"
