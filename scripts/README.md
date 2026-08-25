# Scripts operativos

## `backup-db.sh`

Backup diario de Postgres con rotación (30 diarios + 12 mensuales).

Dumpea las **dos** bases, en archivos separados:

- `imedba-YYYYMMDD-HHMMSS.sql.gz` — datos del negocio
- `keycloak-YYYYMMDD-HHMMSS.sql.gz` — usuarios, passwords y roles asignados

La segunda no es opcional: sin ella un restore devuelve los datos intactos pero **sin
ninguna persona que pueda entrar**. El realm JSON re-importa la estructura del realm, no
las personas dadas de alta desde el módulo Personal.

```bash
# Manual
./scripts/backup-db.sh

# Cron en prod (cada día a las 3 AM)
0 3 * * * /home/imedba/scripts/backup-db.sh >> /var/log/imedba-backup.log 2>&1
```

Variables:

| Variable        | Default               |
| --------------- | --------------------- |
| `BACKUP_DIR`    | `/var/backups/imedba` |
| `POSTGRES_USER` | `imedba`              |
| `POSTGRES_DB`   | `imedba`              |

Si el dump falla o sale sospechosamente chico, el script **descarta el archivo y sale con
error** en vez de dejar un `.gz` vacío haciéndose pasar por backup.

**Ojo con `COMPOSE_FILE`:** estos scripts no le pasan `-f` a docker compose; corren desde
la raíz del repo y dejan que compose resuelva solo. Si el entorno trae `COMPOSE_FILE` con
varios archivos separados por `:` (lo normal en prod), pasarlo como un único `-f` haría
que busque un archivo llamado literalmente `a:b`.

## `restore-db.sh`

Restaura un dump a la DB (DESTRUCTIVO — pide confirmación).

```bash
docker compose stop backend

# Base de negocio
./scripts/restore-db.sh /var/backups/imedba/daily/imedba-20260825-030000.sql.gz

# Usuarios de Keycloak (nótese POSTGRES_DB)
docker compose stop keycloak
POSTGRES_DB=keycloak ./scripts/restore-db.sh /var/backups/imedba/daily/keycloak-20260825-030000.sql.gz
docker compose start keycloak

docker compose start backend
```

## `renew-cert.sh`

Renovación del certificado TLS de producción (Let's Encrypt, 90 días).

```bash
# Cron en prod (lunes a las 3:30)
30 3 * * 1 /home/imedba/scripts/renew-cert.sh >> /var/log/imedba-cert.log 2>&1
```

Usa `--webroot`, no `--standalone`: el puerto 80 lo tiene nginx, así que no hace falta
parar nada. Requiere que `/var/www/certbot` esté montado en el contenedor de nginx (ya
está en `docker-compose.prod.yml`). Copia los `.pem` a `nginx/certs/` y recarga nginx
sólo si el cert efectivamente se renovó.

Para probar sin gastar cuota de emisión, agregar `--dry-run` al `certbot renew`.
