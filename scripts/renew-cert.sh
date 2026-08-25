#!/usr/bin/env bash
# Renovación del certificado TLS de producción (Let's Encrypt, 90 días).
#
# Pensado para cron. Idempotente y barato: certbot no hace nada si al cert le
# quedan más de 30 días, así que se puede correr dos veces por día sin costo.
#
#   0 3 * * 1 /home/imedba/scripts/renew-cert.sh >> /var/log/imedba-cert.log 2>&1
#
# POR QUÉ --webroot Y NO --standalone
# La emisión inicial se hizo con --standalone, que levanta su propio server en el
# puerto 80. Eso sirve una sola vez, cuando nginx todavía no existía: ahora el 80 lo
# tiene nginx y standalone fallaría con "address already in use". Con --webroot,
# certbot escribe el challenge en un directorio que nginx ya sirve bajo
# /.well-known/acme-challenge/ (ver nginx/templates/default.conf.template) y no hace
# falta parar nada. El flag va explícito acá porque el renewal config guardado por la
# emisión inicial dice "standalone"; pasarlo en la línea de comandos lo pisa.
#
# POR QUÉ SE COPIAN LOS .pem
# El contenedor de nginx monta ./nginx/certs, no /etc/letsencrypt. Certbot renueva en
# /etc/letsencrypt/live/$DOMAIN/ y esas copias quedarían viejas; por eso el deploy-hook
# copia y recarga. Un `nginx -s reload` no corta conexiones.
set -euo pipefail

DOMAIN="${DOMAIN:-vps-6294990-x.dattaweb.com}"
PROJECT_DIR="${PROJECT_DIR:-/home/imedba}"
WEBROOT="${WEBROOT:-/var/www/certbot}"

COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

say() { echo "[renew-cert] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

say "chequeando $DOMAIN"

mkdir -p "$WEBROOT"

# --deploy-hook corre SOLO si el cert efectivamente se renovó.
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v "$WEBROOT:$WEBROOT" \
  certbot/certbot renew \
    --webroot -w "$WEBROOT" \
    --cert-name "$DOMAIN" \
    --deploy-hook "touch /etc/letsencrypt/RENEWED-$DOMAIN"

if [ -f "/etc/letsencrypt/RENEWED-$DOMAIN" ]; then
  say "cert renovado — copiando a nginx/certs y recargando"
  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$PROJECT_DIR/nginx/certs/fullchain.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$PROJECT_DIR/nginx/certs/privkey.pem"
  chmod 600 "$PROJECT_DIR/nginx/certs/privkey.pem"
  $COMPOSE exec -T nginx nginx -s reload
  rm -f "/etc/letsencrypt/RENEWED-$DOMAIN"
  say "nginx recargado con el cert nuevo"
else
  say "sin cambios (al cert le quedan más de 30 días)"
fi

# Fecha de vencimiento efectiva, la que sirve nginx. Si esto empieza a acercarse a
# cero es que la renovación no está aplicando aunque el script diga "sin cambios".
VENCE=$(openssl x509 -enddate -noout -in "$PROJECT_DIR/nginx/certs/fullchain.pem" | cut -d= -f2)
say "el cert que sirve nginx vence: $VENCE"
