#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Sync idempotente de ROLES + PERMISOS del realm imedba (reunión 12-jun).
#
# Corre en cada `docker compose up` (servicio keycloak-config). Asegura que existan
# los client-roles (authorities) + realm-roles + sus composites, SIN tocar el resto
# del realm (usuarios, clients, settings de login). Resuelve que `--import-realm` NO
# re-importe un realm que ya existe: este script aplica los roles "por encima".
#
# Idempotente: crea lo que falta, no borra nada. Source-of-truth de roles que debe
# mantenerse en sync con keycloak/realms/imedba-realm.json (el JSON es para el PRIMER
# import — crea realm+clients+usuarios; este script re-aplica roles en cada arranque).
# -----------------------------------------------------------------------------
set -u

KCADM=/opt/keycloak/bin/kcadm.sh
SERVER="${KC_SERVER:-http://keycloak:8080}"
REALM="${KC_REALM:-imedba}"
CLIENT="${KC_CLIENT:-imedba-backend}"
USER="${KEYCLOAK_ADMIN:-admin}"
PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

log() { echo "[sync-roles] $*"; }

# --- Esperar a que Keycloak responda y autenticar ---------------------------
log "esperando Keycloak en $SERVER ..."
i=0
until "$KCADM" config credentials --server "$SERVER" --realm master \
        --user "$USER" --password "$PASS" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then log "TIMEOUT: Keycloak no respondió"; exit 1; fi
  sleep 3
done
log "conectado."

CID=$("$KCADM" get clients -r "$REALM" -q clientId="$CLIENT" \
        --fields id --format csv --noquotes 2>/dev/null | tr -d '\r\n')
if [ -z "$CID" ]; then log "ERROR: no encontré el client $CLIENT en $REALM"; exit 1; fi

# --- 1) Client roles (authorities) ------------------------------------------
# Lista completa de authorities. Agregar una authority nueva = sumarla acá (y al JSON).
ALL_AUTH="students:read students:write courses:read courses:write \
enrollments:read enrollments:write installments:read installments:write \
payments:read payments:write discount_campaigns:read discount_campaigns:write \
budget:read budget:write books:read books:write book_sales:read book_sales:write \
authors:read authors:write diplomas:read diplomas:write staff:read staff:write \
hour_logs:read hour_logs:write contacts:read contacts:write \
notifications:read notifications:write notifications:manage reports:read admin:manage \
moodle:read moodle:write residencias:read residencias:write \
formacion_superior:read formacion_superior:write editorial:read editorial:write \
stock:read stock:write teaching:read settlements:read settlements:write"

for a in $ALL_AUTH; do
  if "$KCADM" create "clients/$CID/roles" -r "$REALM" -s name="$a" >/dev/null 2>&1; then
    log "+ authority $a"
  fi
done

# --- 2) Realm roles + composites --------------------------------------------
ensure_role() {  # $1=name  $2=description
  if "$KCADM" create roles -r "$REALM" -s name="$1" -s "description=$2" >/dev/null 2>&1; then
    log "+ rol $1"
  fi
}
add_auth() {     # $1=role  $2=authority (client role de imedba-backend)
  "$KCADM" add-roles -r "$REALM" --rname "$1" --cclientid "$CLIENT" \
      --rolename "$2" >/dev/null 2>&1 || true
}
grant() {        # $1=role  $resto=authorities
  role="$1"; shift
  for a in "$@"; do add_auth "$role" "$a"; done
  log "= composites de $role asegurados"
}

ensure_role ADMIN          "Administrador: acceso total"
ensure_role VENDEDORA      "Carga alumnos, cursos y cobra (ve sus inscripciones)"
ensure_role SECRETARIA_FS  "Secretaría de Formación Superior (diplomaturas)"
ensure_role SECRETARIA_RM  "Secretaría de Residencias Médicas (Argentina y Uruguay)"
ensure_role EDITORIAL      "Editorial: libros, stock, ventas, autorías"
ensure_role CONTABLE       "Presupuesto, balances y reportes"
ensure_role VIEWER         "Solo lectura global"

# ADMIN: todas las authorities.
grant ADMIN $ALL_AUTH

grant VENDEDORA \
  students:read students:write courses:read enrollments:read enrollments:write \
  payments:read payments:write installments:read installments:write \
  discount_campaigns:read books:read books:write book_sales:read book_sales:write \
  residencias:read residencias:write formacion_superior:read formacion_superior:write \
  notifications:manage notifications:read notifications:write contacts:read

grant SECRETARIA_FS \
  students:read enrollments:read settlements:read settlements:write installments:read \
  teaching:read formacion_superior:read formacion_superior:write notifications:manage \
  diplomas:read diplomas:write notifications:read notifications:write contacts:read

grant SECRETARIA_RM \
  students:read courses:read enrollments:read installments:read teaching:read \
  residencias:read residencias:write notifications:manage notifications:read \
  notifications:write contacts:read

grant EDITORIAL \
  students:read editorial:read editorial:write stock:read stock:write \
  books:read books:write authors:read authors:write book_sales:read book_sales:write

grant CONTABLE \
  budget:read budget:write payments:read reports:read book_sales:read contacts:read

grant VIEWER \
  students:read courses:read enrollments:read payments:read installments:read \
  discount_campaigns:read editorial:read stock:read budget:read teaching:read \
  settlements:read reports:read authors:read books:read book_sales:read diplomas:read \
  staff:read hour_logs:read contacts:read notifications:read

# --- 3) Redirect URIs del client público imedba-frontend (idempotente) -------
# Igual que los roles: el realm JSON los setea en el PRIMER import; esto los RE-APLICA
# en cada `up` para que login/logout funcionen detrás de cualquier proxy/túnel SIN editar
# la consola a mano (`--import-realm` no re-importa un realm existente). Incluye:
#   - localhost (dev)
#   - https://*.trycloudflare.com/*  (ver OJO abajo: NO matchea, es solo placeholder)
#   - https://$SERVER_NAME/*         (dominio público fijo, si está seteado y != localhost)
#   - $FRONTEND_REDIRECT_URIS_EXTRA  (lista extra separada por coma)
# webOrigins="+" y post.logout.redirect.uris="+" => heredan de redirectUris (no hay que
# listar el logout aparte).
# OJO IMPORTANTE: Keycloak NO soporta comodín en el HOST — "https://*.trycloudflare.com/*"
# NO valida contra "https://loquesea.trycloudflare.com/" (el `*` solo funciona al final de
# la URI, no en el subdominio). Consecuencia: con quick-tunnels (hostname random cada `up`)
# el LOGOUT da 400 hasta que se lista la URL EXACTA. Por eso hay que setear la URL del túnel
# actual en FRONTEND_REDIRECT_URIS_EXTRA (o SERVER_NAME) del .env. El login ROPC anda igual
# sin esto (no usa redirect_uri). Para prod con dominio fijo: usar solo https://$SERVER_NAME/*.
FRONTEND_CLIENT="imedba-frontend"
FID=$("$KCADM" get clients -r "$REALM" -q clientId="$FRONTEND_CLIENT" \
        --fields id --format csv --noquotes 2>/dev/null | tr -d '\r\n')
if [ -z "$FID" ]; then
  log "! no encontré el client $FRONTEND_CLIENT — omito redirect URIs"
else
  REDIRECTS='"http://localhost:5173/*","http://localhost:3000/*","http://localhost/*","https://*.trycloudflare.com/*"'
  if [ -n "${SERVER_NAME:-}" ] && [ "$SERVER_NAME" != "localhost" ]; then
    REDIRECTS="$REDIRECTS,\"https://$SERVER_NAME/*\""
  fi
  if [ -n "${FRONTEND_REDIRECT_URIS_EXTRA:-}" ]; then
    IFS=',' read -ra EXTRA <<< "$FRONTEND_REDIRECT_URIS_EXTRA"
    for u in "${EXTRA[@]}"; do
      u="$(echo "$u" | tr -d '[:space:]')"
      [ -n "$u" ] && REDIRECTS="$REDIRECTS,\"$u\""
    done
  fi
  cat > /tmp/frontend-client.json <<EOF
{
  "redirectUris": [ $REDIRECTS ],
  "webOrigins": [ "+" ],
  "attributes": {
    "post.logout.redirect.uris": "+",
    "pkce.code.challenge.method": "S256"
  }
}
EOF
  if "$KCADM" update "clients/$FID" -r "$REALM" -f /tmp/frontend-client.json >/dev/null 2>&1; then
    log "= redirectUris/webOrigins de $FRONTEND_CLIENT re-aplicados"
  else
    log "! no pude actualizar redirectUris de $FRONTEND_CLIENT"
  fi
fi

log "OK — roles y permisos sincronizados."
