# Scripts operativos

## `backup-db.sh`

Backup diario de Postgres con rotación (30 diarios + 12 mensuales).

```bash
# Manual
./scripts/backup-db.sh

# Cron en prod (cada día a las 3 AM)
0 3 * * * /opt/imedba/scripts/backup-db.sh >> /var/log/imedba-backup.log 2>&1
```

Variables:

| Variable        | Default                   |
| --------------- | ------------------------- |
| `BACKUP_DIR`    | `/var/backups/imedba`     |
| `COMPOSE_FILE`  | `../docker-compose.yml`   |
| `POSTGRES_USER` | `imedba`                  |
| `POSTGRES_DB`   | `imedba`                  |

Genera archivos en:

- `${BACKUP_DIR}/daily/imedba-YYYYMMDD-HHMMSS.sql.gz`
- `${BACKUP_DIR}/monthly/imedba-YYYYMM.sql.gz` (sólo el día 1)

## `restore-db.sh`

Restaura un dump a la DB (DESTRUCTIVO — pide confirmación).

```bash
docker compose stop backend
./scripts/restore-db.sh /var/backups/imedba/daily/imedba-20260423-030000.sql.gz
docker compose start backend
```

## `sql/diagnostico-deploy.sql`

Diagnóstico de datos, sólo lectura. Se corre antes y después de cada deploy para ver qué
arreglaron las migraciones `V0NN__fix_*` y qué queda para resolver a mano. Procedimiento y
reglas en el README raíz, sección "Base de datos en el deploy".

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < scripts/sql/diagnostico-deploy.sql
```
