#!/usr/bin/env bash
# Cutover del dominio público: vps-6294990-x.dattaweb.com -> gestion.imedba.com
#
# REQUISITO PREVIO (lo hace David, en el DNS de imedba.com / Cloudflare):
#   1. BORRAR la Redirect Rule / redirección 301 de gestion.imedba.com.
#      Hoy devuelve: 301 -> https://vps-6294990-x.dattaweb.com/  (por eso cambia la URL).
#   2. CREAR un A record:   gestion.imedba.com  ->  179.43.112.23
#      Modo "DNS only" (nube GRIS en Cloudflare). Con nube naranja el
#      challenge de Let's Encrypt y el modo SSL de CF necesitan config extra.
#      Opcional AAAA: gestion.imedba.com -> 2800:6c0:6::4a0
#
# Qué hace este script (idempotente, se puede correr de nuevo sin romper nada):
#   - Verifica que el DNS ya apunte a este server.
#   - Expande el cert de Let's Encrypt para cubrir los DOS hostnames
#     (mantiene el cert-name viejo => scripts/renew-cert.sh sigue andando igual).
#   - Actualiza .env: SERVER_NAME, KEYCLOAK_HOSTNAME, issuer del backend, CORS,
#     y deja el hostname viejo como redirect URI extra de Keycloak.
#   - Recrea keycloak / backend / keycloak-config / nginx.
#   - Smoke test final.
#
# Uso:  sudo /home/imedba/scripts/setup-domain-gestion.sh
set -euo pipefail

DOMAIN="${DOMAIN:-gestion.imedba.com}"
OLD_DOMAIN="${OLD_DOMAIN:-vps-6294990-x.dattaweb.com}"
PROJECT_DIR="${PROJECT_DIR:-/home/imedba}"
WEBROOT="${WEBROOT:-/var/www/certbot}"
EMAIL="${EMAIL:-santiscally@gmail.com}"

COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

say() { echo "[setup-domain] $*"; }
die() { echo "[setup-domain] ERROR: $*" >&2; exit 1; }

cd "$PROJECT_DIR"

# --- 1) El A record tiene que resolver a ESTE server -------------------------
# Sin esto el challenge HTTP-01 de Let's Encrypt falla (el .well-known lo tiene
# que servir nuestro nginx, no el redirect de Cloudflare).
MYIP=$(curl -s4 --max-time 10 https://api.ipify.org)
DNSIP=$(dig +short A "$DOMAIN" @1.1.1.1 | tail -1)
[ -n "$DNSIP" ] || die "$DOMAIN no resuelve todavía — falta el A record (o no propagó)."
if [ "$DNSIP" != "$MYIP" ]; then
  die "$DOMAIN resuelve a $DNSIP pero este server es $MYIP.
     Si $DNSIP es una IP de Cloudflare (104.x / 172.67.x) el record está en nube NARANJA
     o sigue la redirect rule vieja. Pedir 'DNS only' (nube gris) y volver a correr."
fi
say "DNS OK: $DOMAIN -> $DNSIP"

# El nginx de prod escucha :80 como default_server y ya sirve /.well-known/acme-challenge/
# desde $WEBROOT, así que el challenge entra sin tocar nada.
mkdir -p "$WEBROOT"

# --- 2) Cert que cubre los dos hostnames -------------------------------------
# --cert-name = el nombre VIEJO a propósito: así el renewal config y el cron de
# renew-cert.sh (que usa --cert-name vps-6294990-x.dattaweb.com) siguen sirviendo.
# --webroot explícito porque la emisión original quedó guardada como "standalone".
if openssl x509 -in "$PROJECT_DIR/nginx/certs/fullchain.pem" -noout -ext subjectAltName 2>/dev/null | grep -q "DNS:$DOMAIN"; then
  say "el cert ya cubre $DOMAIN, salteando emisión"
else
  say "expandiendo cert para: $OLD_DOMAIN + $DOMAIN"
  docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -v "$WEBROOT:$WEBROOT" \
    certbot/certbot certonly \
      --webroot -w "$WEBROOT" \
      --cert-name "$OLD_DOMAIN" \
      -d "$OLD_DOMAIN" -d "$DOMAIN" \
      --expand --non-interactive --agree-tos -m "$EMAIL"

  # El contenedor de nginx monta ./nginx/certs, no /etc/letsencrypt (ver renew-cert.sh).
  cp "/etc/letsencrypt/live/$OLD_DOMAIN/fullchain.pem" "$PROJECT_DIR/nginx/certs/fullchain.pem"
  cp "/etc/letsencrypt/live/$OLD_DOMAIN/privkey.pem"   "$PROJECT_DIR/nginx/certs/privkey.pem"
  chmod 600 "$PROJECT_DIR/nginx/certs/privkey.pem"
  say "cert copiado a nginx/certs"
fi

# --- 3) .env -----------------------------------------------------------------
# SERVER_NAME queda con UN solo host: sync-roles.sh arma "https://$SERVER_NAME/*"
# y con dos valores separados por espacio generaría una redirect URI inválida.
# No hace falta listar el viejo en nginx: el bloque 443 es el único, así que es
# el default server y responde igual con Host: $OLD_DOMAIN.
say "actualizando .env"
cp .env ".env.bak-$(date +%Y%m%d-%H%M%S)"
sed -i \
  -e "s|^SERVER_NAME=.*|SERVER_NAME=$DOMAIN|" \
  -e "s|^KEYCLOAK_HOSTNAME=.*|KEYCLOAK_HOSTNAME=$DOMAIN|" \
  -e "s|^KEYCLOAK_ISSUER_URI=.*|KEYCLOAK_ISSUER_URI=https://$DOMAIN/auth/realms/imedba|" \
  -e "s|^APP_CORS_ALLOWED_ORIGINS=.*|APP_CORS_ALLOWED_ORIGINS=https://$DOMAIN,https://$OLD_DOMAIN|" \
  -e "s|^FRONTEND_REDIRECT_URIS_EXTRA=.*|FRONTEND_REDIRECT_URIS_EXTRA=https://$OLD_DOMAIN/*|" \
  .env
grep -E '^(SERVER_NAME|KEYCLOAK_HOSTNAME|KEYCLOAK_ISSUER_URI|APP_CORS_ALLOWED_ORIGINS|FRONTEND_REDIRECT_URIS_EXTRA)=' .env

# --- 4) Recrear los servicios afectados --------------------------------------
# keycloak: KC_HOSTNAME cambia -> los tokens pasan a salir con iss=https://$DOMAIN/...
# backend:  el issuer esperado tiene que cambiar EN EL MISMO paso, si no da 401 en todo.
# keycloak-config: re-aplica redirectUris del client imedba-frontend.
# nginx: re-corre envsubst con el SERVER_NAME nuevo y toma el cert nuevo.
say "recreando keycloak + backend + keycloak-config + nginx"
$COMPOSE up -d keycloak
$COMPOSE up -d backend keycloak-config nginx

# --- 5) Smoke test -----------------------------------------------------------
say "esperando a que levante el backend..."
for i in $(seq 1 40); do
  curl -sf --max-time 5 "https://$DOMAIN/api/actuator/health" >/dev/null 2>&1 && break
  sleep 5
done

echo
say "--- verificación ---"
say "cert SAN:"; openssl x509 -in "$PROJECT_DIR/nginx/certs/fullchain.pem" -noout -ext subjectAltName | tail -1
say "issuer que publica Keycloak (tiene que decir https://$DOMAIN/...):"
curl -s --max-time 10 "https://$DOMAIN/auth/realms/imedba/.well-known/openid-configuration" | grep -o '"issuer":"[^"]*"' || echo "  (no respondió)"
say "SPA:";     curl -s -o /dev/null -w "  https://$DOMAIN/ -> %{http_code}\n" --max-time 10 "https://$DOMAIN/"
say "health:";  curl -s -o /dev/null -w "  https://$DOMAIN/api/actuator/health -> %{http_code}\n" --max-time 10 "https://$DOMAIN/api/actuator/health"
say "hostname viejo (debe seguir andando):"
curl -s -o /dev/null -w "  https://$OLD_DOMAIN/ -> %{http_code}\n" --max-time 10 "https://$OLD_DOMAIN/"

echo
say "listo -> https://$DOMAIN"
say "Probar el LOGIN a mano en el navegador: es lo único que este script no valida."
