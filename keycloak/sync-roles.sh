#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Sync idempotente de ROLES + PERMISOS del realm imedba (reunión 12-jun).
#
# Corre en cada `docker compose up` (servicio keycloak-config). Asegura que existan
# los client-roles (authorities) + realm-roles + sus composites, SIN tocar el resto
# del realm (usuarios, clients, settings de login). Resuelve que `--import-realm` NO
# re-importe un realm que ya existe: este script aplica los roles "por encima".
#
# Idempotente: crea lo que falta y a cada rol le saca las authorities que ya no le tocan. Source-of-truth de roles que debe
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
sales_commissions:read sales_commissions:write \
hour_logs:read hour_logs:write contacts:read contacts:write \
notifications:read notifications:write notifications:manage reports:read admin:manage \
moodle:read moodle:write residencias:read residencias:write \
formacion_superior:read formacion_superior:write editorial:read editorial:write \
stock:read stock:write teaching:read settlements:read settlements:write \
dashboard:read academico:read finanzas:read"

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

ensure_role ADMIN          "Administrador: acceso total"
ensure_role VENDEDORA      "Académico y Editorial completos; cobra (ve sus inscripciones)"
ensure_role SECRETARIA     "Secretaría: Académico completo (Residencias y Formación Superior)"
ensure_role SECRETARIA_FS  "DEPRECADO: usar SECRETARIA"
ensure_role SECRETARIA_RM  "DEPRECADO: usar SECRETARIA"
ensure_role EDITORIAL      "Editorial: libros, colecciones, ventas, autorías"
ensure_role CONTABLE       "Contable: acceso a todo menos la gestión de usuarios"
ensure_role VIEWER         "Solo lectura global"

# grant deja al rol con EXACTAMENTE estas authorities: agrega las que faltan y saca el resto.
grant() {        # $1=role  $resto=authorities
  role="$1"; shift
  for a in "$@"; do add_auth "$role" "$a"; done
  current=$("$KCADM" get-roles -r "$REALM" --rname "$role" --cclientid "$CLIENT" \
              --fields name --format csv --noquotes 2>/dev/null | tr -d '\r')
  for c in $current; do
    case " $* " in
      *" $c "*) ;;
      *) "$KCADM" remove-roles -r "$REALM" --rname "$role" --cclientid "$CLIENT" \
             --rolename "$c" >/dev/null 2>&1 && log "- $role pierde $c" ;;
    esac
  done
  log "= composites de $role sincronizados"
}

# Secciones del menú (docx IMEDBA 2026-09-24): cada rol recibe bloques completos.
ACADEMICO="academico:read students:read students:write courses:read courses:write \
enrollments:read enrollments:write diplomas:read diplomas:write staff:read staff:write \
hour_logs:read hour_logs:write teaching:read installments:read \
residencias:read residencias:write formacion_superior:read formacion_superior:write \
notifications:read notifications:write notifications:manage contacts:read"

EDITORIAL_AUTH="editorial:read editorial:write books:read books:write authors:read authors:write \
book_sales:read book_sales:write stock:read stock:write students:read"

CONTABLE_AUTH=""
for a in $ALL_AUTH; do [ "$a" = "admin:manage" ] || CONTABLE_AUTH="$CONTABLE_AUTH $a"; done

# shellcheck disable=SC2086
{
grant ADMIN $ALL_AUTH

grant VENDEDORA dashboard:read $ACADEMICO $EDITORIAL_AUTH \
  finanzas:read payments:read payments:write installments:write discount_campaigns:read

grant SECRETARIA    dashboard:read $ACADEMICO
grant SECRETARIA_FS dashboard:read $ACADEMICO
grant SECRETARIA_RM dashboard:read $ACADEMICO

grant EDITORIAL $EDITORIAL_AUTH

grant CONTABLE $CONTABLE_AUTH

grant VIEWER \
  dashboard:read academico:read finanzas:read editorial:read \
  students:read courses:read enrollments:read payments:read installments:read \
  discount_campaigns:read stock:read budget:read teaching:read \
  settlements:read reports:read authors:read books:read book_sales:read diplomas:read \
  sales_commissions:read staff:read hour_logs:read contacts:read notifications:read
}

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

  # --- 4) Claim `sub` en el access token (idempotente) -----------------------
  # Desde Keycloak 24 el `sub` NO está hardcodeado: lo emite el client scope
  # `basic`. Nuestro realm JSON declara su propia lista de `clientScopes`, que
  # REEMPLAZA las built-in, así que `basic` nunca se crea y los tokens salían SIN
  # `sub`. Consecuencia: `AuthUtils.currentUserId()` devolvía vacío y todo lo que
  # depende de quién hizo la acción quedaba en NULL — `enrollments.enrolled_by`
  # (o sea la liquidación de comisiones no encontraba vendedoras y el filtro
  # "la vendedora ve sólo lo suyo" no filtraba), `budget_entries.registered_by`
  # y los `created_by` de auditoría.
  # Se agrega el mapper al client en vez de crear el scope `basic`: es puntual y
  # no toca la lista de scopes del realm.
  if "$KCADM" get "clients/$FID/protocol-mappers/models" -r "$REALM" \
        --fields name --format csv --noquotes 2>/dev/null | tr -d '\r' | grep -qx "sub"; then
    log "= mapper 'sub' de $FRONTEND_CLIENT ya estaba"
  else
    cat > /tmp/sub-mapper.json <<'EOF'
{
  "name": "sub",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-sub-mapper",
  "consentRequired": false,
  "config": {
    "access.token.claim": "true",
    "introspection.token.claim": "true"
  }
}
EOF
    if "$KCADM" create "clients/$FID/protocol-mappers/models" -r "$REALM" \
          -f /tmp/sub-mapper.json >/dev/null 2>&1; then
      log "+ mapper 'sub' agregado a $FRONTEND_CLIENT (sin esto enrolled_by queda NULL)"
    else
      log "! no pude agregar el mapper 'sub' a $FRONTEND_CLIENT"
    fi
  fi
fi

log "OK — roles y permisos sincronizados."
