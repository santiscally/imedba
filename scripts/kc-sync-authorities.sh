#!/usr/bin/env bash
#
# Sincroniza las 4 authorities (installments + discount_campaigns) al
# Keycloak corriendo, sin necesidad de `docker compose down -v`.
#
# El realm export (`keycloak/realms/imedba-realm.json`) sólo se importa la
# primera vez (cuando arranca con DB vacía). Este script aplica esas
# authorities + composites al Keycloak vivo via kcadm.sh.
#
# Idempotente: si una authority o composite ya existe, no rompe.
#
# Uso:
#   ./scripts/kc-sync-authorities.sh
#
# Requiere: docker compose up para el servicio `keycloak` corriendo.
#
set -euo pipefail

# Evita que MSYS/Git-Bash en Windows convierta /opt/... a C:/Program Files/Git/opt/...
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

REALM="imedba"
CLIENT_ID="imedba-backend"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

NEW_ROLES=(
  "installments:read"
  "installments:write"
  "discount_campaigns:read"
  "discount_campaigns:write"
)

# Realm-role -> lista de client-roles a componer
composites_for() {
  case "$1" in
    ADMIN)         echo "installments:read installments:write discount_campaigns:read discount_campaigns:write" ;;
    VENDEDORA)     echo "installments:read installments:write discount_campaigns:read" ;;
    SECRETARIA_FS) echo "installments:read" ;;
    CONTABLE)      echo "installments:read installments:write discount_campaigns:read discount_campaigns:write" ;;
    VIEWER)        echo "installments:read discount_campaigns:read" ;;
    *) echo "" ;;
  esac
}

REALM_ROLES=(ADMIN VENDEDORA SECRETARIA_FS CONTABLE VIEWER)

KC=(docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh)

echo "→ Autenticando como ${ADMIN_USER}…"
"${KC[@]}" config credentials --server http://localhost:8080 \
    --realm master --user "$ADMIN_USER" --password "$ADMIN_PASS" >/dev/null

echo "→ Buscando UUID del client ${CLIENT_ID}…"
CLIENT_UUID="$(
  "${KC[@]}" get clients -r "$REALM" \
    -q "clientId=${CLIENT_ID}" --fields id --format csv --noquotes \
  | tr -d '\r' | tail -n1
)"
if [ -z "$CLIENT_UUID" ]; then
  echo "✗ No se pudo encontrar el client ${CLIENT_ID} en el realm ${REALM}" >&2
  exit 1
fi
echo "  UUID = ${CLIENT_UUID}"

echo "→ Creando client roles faltantes…"
for ROLE in "${NEW_ROLES[@]}"; do
  if "${KC[@]}" get "clients/${CLIENT_UUID}/roles/${ROLE}" -r "$REALM" >/dev/null 2>&1; then
    echo "  ✓ ya existe: ${ROLE}"
  else
    "${KC[@]}" create "clients/${CLIENT_UUID}/roles" -r "$REALM" -s "name=${ROLE}" >/dev/null
    echo "  + creado:   ${ROLE}"
  fi
done

echo "→ Componiendo realm roles…"
for REALM_ROLE in "${REALM_ROLES[@]}"; do
  CR_LIST="$(composites_for "$REALM_ROLE")"
  for CR in $CR_LIST; do
    if "${KC[@]}" add-roles -r "$REALM" --rname "$REALM_ROLE" \
         --cclientid "$CLIENT_ID" --rolename "$CR" >/dev/null 2>&1; then
      echo "  + ${REALM_ROLE} ← ${CR}"
    else
      echo "  ✓ ${REALM_ROLE} ya tenía ${CR}"
    fi
  done
done

echo "✔ Authorities aplicadas. Los usuarios deben re-loguear para refrescar el JWT."
