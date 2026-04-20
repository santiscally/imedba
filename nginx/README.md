# Nginx (producción)

Reverse proxy TLS para el stack IMEDBA. En dev no se usa (los servicios
se exponen directo al host vía docker-compose). Sólo se levanta cuando
se aplica el override de producción:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Ruteo

| URL pública                                  | Upstream interno                  |
| -------------------------------------------- | --------------------------------- |
| `https://${SERVER_NAME}/`                    | `frontend:80` (SPA estático)      |
| `https://${SERVER_NAME}/api/...`             | `backend:8080/api/...`            |
| `https://${SERVER_NAME}/auth/...`            | `keycloak:8080/auth/...`          |

Keycloak corre con `KC_HTTP_RELATIVE_PATH=/auth` para vivir bajo el
subpath y compartir certificado con el resto del dominio.

## Certificados

El contenedor espera dos archivos en `./nginx/certs/`:

- `fullchain.pem` — certificado + intermedios
- `privkey.pem`   — clave privada

Están montados read-only en `/etc/nginx/certs/`. El directorio se
commitea vacío (`.gitkeep`) y los `.pem` están ignorados por git.

### Opciones para obtenerlos

**1) Let's Encrypt vía certbot (recomendado en Don Web / VPS):**

```bash
# Primera emisión (HTTP-01 challenge, el nginx debe estar abajo)
docker run --rm \
  -p 80:80 \
  -v "$(pwd)/nginx/certs:/etc/letsencrypt/live/${SERVER_NAME}" \
  certbot/certbot certonly --standalone \
    -d ${SERVER_NAME} \
    --agree-tos -m admin@${SERVER_NAME} --no-eff-email
```

Después, copiar/linkear `fullchain.pem` y `privkey.pem` a
`./nginx/certs/`. Renovación manual con `certbot renew` + `nginx -s reload`.

**2) Certificado comercial / auto-firmado para staging:**

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout ./nginx/certs/privkey.pem \
  -out    ./nginx/certs/fullchain.pem \
  -subj "/CN=${SERVER_NAME}"
```

Sirve para levantar el stack en staging antes de tener el cert real.

## Variables de entorno relevantes

Definidas en `.env` (ver `.env.example`):

- `SERVER_NAME` — dominio público del sitio (ej. `app.imedba.com.ar`).
  Se sustituye en `conf.d/default.conf` al arrancar el contenedor nginx.
- `KEYCLOAK_HOSTNAME` — mismo dominio que `SERVER_NAME` en prod.
- `KEYCLOAK_ISSUER_URI` — `https://${SERVER_NAME}/auth/realms/imedba`.
- `KEYCLOAK_JWK_SET_URI` — red interna: `http://keycloak:8080/auth/realms/imedba/protocol/openid-connect/certs`.
