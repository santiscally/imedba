#!/usr/bin/env bash
# Paso final del demo con URL fija: emite el cert de Let's Encrypt para el
# subdominio y agrega el bloque 443 al vhost.
#
# Requisito previo (manual, en el panel de DonWeb): A record
#   imedba.simpleapps.com.ar -> 149.50.147.54
#
# Idempotente: si el cert ya existe no lo re-emite, y si el bloque 443 ya está
# no lo duplica. Correr como root:  sudo scripts/setup-tls-demo.sh
set -euo pipefail

DOMAIN="${DOMAIN:-imedba.simpleapps.com.ar}"
WEBROOT="${WEBROOT:-/var/www/certbot}"
VHOST="/etc/nginx/sites-available/$DOMAIN"
EMAIL="${EMAIL:-santiscally@gmail.com}"

say() { echo "[setup-tls] $*"; }

# 1. El A record tiene que resolver a ESTE server, si no el challenge falla.
MYIP=$(curl -s --max-time 10 https://api.ipify.org)
DNSIP=$(dig +short A "$DOMAIN" | tail -1)
if [ -z "$DNSIP" ]; then
  say "ERROR: $DOMAIN no resuelve todavía. Falta el A record en DonWeb (o no propagó)."
  exit 1
fi
if [ "$DNSIP" != "$MYIP" ]; then
  say "ERROR: $DOMAIN resuelve a $DNSIP pero este server es $MYIP."
  exit 1
fi
say "DNS OK: $DOMAIN -> $DNSIP"

# 2. Cert por webroot, igual que el de simpleapps.com.ar (no toca nginx ni lo para).
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  say "el cert de $DOMAIN ya existe, salteando emisión"
else
  say "emitiendo cert para $DOMAIN"
  certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$EMAIL"
fi

# 3. Bloque 443. Se agrega una sola vez.
if grep -q 'listen 443' "$VHOST"; then
  say "el bloque 443 ya está en el vhost, salteando"
else
  say "agregando bloque 443 a $VHOST"
  cp "$VHOST" "$VHOST.bak-$(date +%Y%m%d-%H%M%S)"
  cat >> "$VHOST" <<EOF

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location ^~ /.well-known/acme-challenge/ {
        root $WEBROOT;
        default_type "text/plain";
        try_files \$uri =404;
    }

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host  \$host;
        proxy_read_timeout 120s;
    }
}
EOF
fi

nginx -t
systemctl reload nginx
say "nginx recargado"

# 4. La app tiene dos valores clavados al origen público: sin esto el POST da
#    403 (CORS) y el logout 400 (redirect URI no permitida).
say "actualizando .env y recreando backend + keycloak-config"
cd /home/imedba
cp .env ".env.bak-$(date +%Y%m%d-%H%M%S)"
sed -i \
  -e "s|^APP_CORS_ALLOWED_ORIGINS=.*|APP_CORS_ALLOWED_ORIGINS=https://$DOMAIN,http://localhost:5173|" \
  -e "s|^FRONTEND_REDIRECT_URIS_EXTRA=.*|FRONTEND_REDIRECT_URIS_EXTRA=https://$DOMAIN/*|" \
  .env
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d backend keycloak-config
docker compose -f docker-compose.yml -f docker-compose.demo.yml restart nginx

say "listo -> https://$DOMAIN"
say "el túnel ya no hace falta: sudo systemctl disable --now imedba-tunnel.service"
