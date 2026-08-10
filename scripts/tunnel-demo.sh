#!/usr/bin/env bash
# Levanta el túnel del demo y sincroniza la config que depende de su URL.
#
# Lo corre systemd (imedba-tunnel.service). Dos modos, según haya credenciales
# de Cloudflare o no:
#
#   named  -> si existe $TUNNEL_NAME en las credenciales: URL FIJA, no hay que
#             resincronizar nada (el .env ya tiene el hostname definitivo).
#   quick  -> fallback sin cuenta: quick tunnel con URL random en cada arranque.
#             El script la detecta, la escribe en el .env y recrea los servicios
#             que la tienen clavada (backend por CORS, keycloak-config por los
#             redirect URIs del logout). Sin esto, tras cada reboot el front
#             carga pero el POST da 403 y el logout 400.
#
# El proceso de cloudflared queda en foreground (systemd Type=simple lo trackea).
set -uo pipefail

REPO_DIR="${REPO_DIR:-/home/imedba}"
ENV_FILE="$REPO_DIR/.env"
LOG_FILE="${LOG_FILE:-/var/log/imedba-tunnel.log}"
TARGET="${TARGET:-http://127.0.0.1:8090}"
TUNNEL_NAME="${TUNNEL_NAME:-imedba-demo}"
COMPOSE=(docker compose -f "$REPO_DIR/docker-compose.yml" -f "$REPO_DIR/docker-compose.demo.yml")

log() { echo "[tunnel-demo] $(date -Is) $*"; }

# --- modo named: URL fija, arranca y listo -----------------------------------
if cloudflared tunnel info "$TUNNEL_NAME" >/dev/null 2>&1; then
  log "named tunnel '$TUNNEL_NAME' encontrado -> URL fija, sin resync"
  exec cloudflared tunnel run "$TUNNEL_NAME"
fi

# --- modo quick: URL random, hay que resincronizar ---------------------------
log "sin credenciales de Cloudflare -> quick tunnel (URL random)"
: > "$LOG_FILE"
cloudflared tunnel --url "$TARGET" >>"$LOG_FILE" 2>&1 &
CF_PID=$!
# si systemd nos mata, no dejar el túnel huérfano
trap 'kill "$CF_PID" 2>/dev/null' EXIT INT TERM

# La URL aparece en el log unos segundos después del arranque.
URL=""
for _ in $(seq 1 60); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
  [ -n "$URL" ] && break
  kill -0 "$CF_PID" 2>/dev/null || { log "ERROR: cloudflared murió durante el arranque"; exit 1; }
  sleep 2
done
[ -z "$URL" ] && { log "ERROR: no se pudo determinar la URL del túnel"; exit 1; }
log "URL del túnel: $URL"

# Sólo tocar el .env y recrear contenedores si la URL cambió: un restart del
# servicio con la misma URL no debe reiniciar medio stack.
PREV=$(grep -E '^APP_CORS_ALLOWED_ORIGINS=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | cut -d, -f1)
if [ "$PREV" = "$URL" ]; then
  log "la URL no cambió, no hay nada que resincronizar"
else
  log "URL cambió (antes: ${PREV:-<vacío>}) -> actualizando $ENV_FILE"
  cp "$ENV_FILE" "$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)"

  # upsert: reemplaza la línea si existe, la agrega si no.
  set_var() {
    local key="$1" val="$2"
    if grep -qE "^${key}=" "$ENV_FILE"; then
      # el valor lleva '/' y '*', por eso el separador '|' en sed
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
    fi
  }
  # sin barra final: CORS compara el Origin exacto
  set_var APP_CORS_ALLOWED_ORIGINS "${URL},http://localhost:5173"
  # con /*: Keycloak valida la post_logout_redirect_uri por prefijo
  set_var FRONTEND_REDIRECT_URIS_EXTRA "${URL}/*"

  log "recreando backend + keycloak-config"
  "${COMPOSE[@]}" up -d backend keycloak-config >>"$LOG_FILE" 2>&1 \
    || log "WARN: falló el up de backend/keycloak-config, revisar $LOG_FILE"

  # El backend recreado toma IP nueva y nginx-demo cachea la vieja -> 502 en /api.
  log "reiniciando nginx-demo (evita 502 por IP cacheada del backend)"
  "${COMPOSE[@]}" restart nginx >>"$LOG_FILE" 2>&1 \
    || log "WARN: falló el restart de nginx-demo, revisar $LOG_FILE"
fi

log "túnel activo en $URL"
wait "$CF_PID"
