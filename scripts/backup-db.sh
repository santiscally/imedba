#!/usr/bin/env bash
#
# Backup diario de Postgres (servicio `db` en docker compose).
# Rotación: mantiene los últimos 30 diarios + los 12 primeros-de-mes.
#
# Dumpea las DOS bases, en archivos separados:
#   imedba-YYYYMMDD-HHMMSS.sql.gz     — datos del negocio
#   keycloak-YYYYMMDD-HHMMSS.sql.gz   — usuarios, passwords y roles asignados
#
# La segunda no es opcional: sin ella, un restore devuelve los datos intactos pero sin
# ninguna persona que pueda entrar al sistema. El realm JSON re-importa la estructura del
# realm, no las personas dadas de alta desde el módulo Personal.
#
# Uso manual:
#   ./scripts/backup-db.sh
#
# Cron (en el host de producción):
#   0 3 * * * /home/imedba/scripts/backup-db.sh >> /var/log/imedba-backup.log 2>&1
#
# Variables de entorno:
#   BACKUP_DIR     — destino (default: /var/backups/imedba)
#   POSTGRES_USER  — usuario de DB (default: imedba)
#   POSTGRES_DB    — base de negocio (default: imedba)
#
# NOTA sobre COMPOSE_FILE: este script NO le pasa `-f` a docker compose. Corre desde la
# raíz del repo y deja que docker compose resuelva solo. Si el entorno trae COMPOSE_FILE
# con varios archivos separados por ':' (sintaxis nativa de compose, la que usa prod),
# pasarlo como un único `-f` haría que busque un archivo llamado literalmente "a:b".
# Ese fue el bug del 2026-08-25: el dump nunca corría y el `| gzip > archivo` dejaba
# igual un .gz de 20 bytes en daily/, haciéndose pasar por un backup bueno.
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/imedba}"
POSTGRES_USER="${POSTGRES_USER:-imedba}"
POSTGRES_DB="${POSTGRES_DB:-imedba}"

# Un dump vacío de Postgres pesa unos cientos de bytes comprimido. Cualquier cosa por
# debajo de esto es un dump fallido, no una base chica.
readonly MIN_BYTES=2048

timestamp="$(date +%Y%m%d-%H%M%S)"
day_of_month="$(date +%d)"

mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/monthly"
cd "${REPO_DIR}"

for db in "${POSTGRES_DB}" keycloak; do
    out_file="${BACKUP_DIR}/daily/${db}-${timestamp}.sql.gz"
    tmp_file="${out_file}.partial"

    echo "[$(date -Iseconds)] backup start → ${out_file}"

    # Se escribe a .partial y recién al final se renombra: si el dump falla, en daily/
    # no queda ningún archivo que parezca un backup válido.
    if ! docker compose exec -T db \
            pg_dump -U "${POSTGRES_USER}" -d "${db}" \
                    --no-owner --no-privileges --clean --if-exists \
          | gzip -9 > "${tmp_file}"; then
        rm -f "${tmp_file}"
        echo "[$(date -Iseconds)] ERROR: pg_dump de ${db} falló. Backup DESCARTADO."
        exit 1
    fi

    actual_bytes=$(stat -c%s "${tmp_file}")
    if [ "${actual_bytes}" -lt "${MIN_BYTES}" ]; then
        rm -f "${tmp_file}"
        echo "[$(date -Iseconds)] ERROR: el dump de ${db} pesa ${actual_bytes} bytes (< ${MIN_BYTES}). Backup DESCARTADO."
        exit 1
    fi

    mv "${tmp_file}" "${out_file}"
    echo "[$(date -Iseconds)] ok ${db} (${actual_bytes} bytes)"

    # Si es el día 1 del mes, copiar también al directorio monthly.
    if [ "${day_of_month}" = "01" ]; then
        cp "${out_file}" "${BACKUP_DIR}/monthly/${db}-$(date +%Y%m).sql.gz"
        echo "[$(date -Iseconds)] monthly snapshot de ${db} creado"
    fi
done

# Rotación: borra backups diarios > 30 días y mensuales > 365 días. Los patrones cubren
# las dos bases.
find "${BACKUP_DIR}/daily"   -name '*.sql.gz' -type f -mtime +30  -delete
find "${BACKUP_DIR}/monthly" -name '*.sql.gz' -type f -mtime +365 -delete

echo "[$(date -Iseconds)] backup done"
