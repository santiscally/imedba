#!/usr/bin/env bash
#
# Sincroniza TODAS las authorities que el backend chequea (@PreAuthorize) al
# Keycloak corriendo, sin necesidad de `docker compose down -v`.
#
# El realm export (`keycloak/realms/imedba-realm.json`) sólo se importa la
# primera vez (cuando arranca con DB vacía). Este script aplica las client
# roles faltantes + sus composites por rol al Keycloak vivo via kcadm.sh.
#
# Es ADITIVO e IDEMPOTENTE: crea lo que falta, no borra lo que sobra.
#
# Contexto: el realm original definió authorities "conceptuales" (editorial,
# stock, teaching, settlements, notifications:manage) que el código NUNCA usó —
# el código quedó con authorities por módulo (books, authors, book_sales,
# diplomas, staff, hour_logs, contacts, notifications:read/write). Por eso
# Diplomaturas/Libros/Ventas/Personal/Horas/Contactos/Notificaciones daban 403.
#
# Uso:   ./scripts/kc-sync-authorities.sh
# Requiere: el servicio `keycloak` corriendo.
#
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

REALM="imedba"
CLIENT_ID="imedba-backend"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

# Client roles que el código usa y que faltaban en el realm export.
NEW_ROLES=(
  "authors:read"        "authors:write"
  "books:read"          "books:write"
  "book_sales:read"     "book_sales:write"
  "diplomas:read"       "diplomas:write"
  "staff:read"          "staff:write"
  "hour_logs:read"      "hour_logs:write"
  "contacts:read"       "contacts:write"
  "notifications:read"  "notifications:write"
  "moodle:read"         "moodle:write"
)

# Realm-role -> client-roles a componer (additivo; los previos quedan).
composites_for() {
  case "$1" in
    ADMIN)
      echo "authors:read authors:write books:read books:write book_sales:read book_sales:write \
            diplomas:read diplomas:write staff:read staff:write hour_logs:read hour_logs:write \
            contacts:read contacts:write notifications:read notifications:write \
            moodle:read moodle:write" ;;
    VENDEDORA)
      echo "notifications:read notifications:write contacts:read" ;;
    SECRETARIA_FS)
      echo "diplomas:read diplomas:write notifications:read notifications:write contacts:read" ;;
    EDITORIAL)
      echo "books:read books:write authors:read authors:write book_sales:read book_sales:write" ;;
    CONTABLE)
      echo "book_sales:read contacts:read" ;;
    VIEWER)
      echo "authors:read books:read book_sales:read diplomas:read staff:read hour_logs:read \
            contacts:read notifications:read" ;;
    *) echo "" ;;
  esac
}

REALM_ROLES=(ADMIN VENDEDORA SECRETARIA_FS EDITORIAL CONTABLE VIEWER)

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
[ -n "$CLIENT_UUID" ] || { echo "✗ client ${CLIENT_ID} no encontrado" >&2; exit 1; }
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
  for CR in $(composites_for "$REALM_ROLE"); do
    if "${KC[@]}" add-roles -r "$REALM" --rname "$REALM_ROLE" \
         --cclientid "$CLIENT_ID" --rolename "$CR" >/dev/null 2>&1; then
      echo "  + ${REALM_ROLE} ← ${CR}"
    else
      echo "  ✓ ${REALM_ROLE} ya tenía ${CR}"
    fi
  done
done

echo "✔ Authorities aplicadas. Los usuarios deben re-loguear para refrescar el JWT."
