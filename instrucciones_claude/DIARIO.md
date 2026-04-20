# DIARIO — Bitácora compartida de Claudes

> **Qué es esto.** Una bitácora append-only donde cada Claude (el de Santi y el del socio) deja registro de **qué hizo**, **por qué**, **qué errores se encontraron**, y **qué debería saber el otro**. Sirve para que la próxima sesión (cualquiera de los dos) arranque con contexto real de lo que ya pasó.
>
> **Regla de uso para el Claude que esté activo:**
> 1. Al **arrancar sesión**: leer las últimas ~10 entradas (las más recientes arriba).
> 2. Al **cerrar una tarea no trivial** (feature, bug-fix, decisión arquitectónica, cambio en infra, fix de build, etc.): agregar una entrada siguiendo el formato de abajo.
> 3. **No editar entradas viejas.** Si algo cambió, agregar entrada nueva con "corrección" o "actualización".
> 4. Ordenar por fecha **descendente** (lo más nuevo arriba).
>
> **No es para:** changelogs de usuario, release notes, ni PR descriptions. Eso va a otros archivos.
>
> **Cuándo archivar.** Cuando el archivo supere ~300 entradas, moverlas a `DIARIO-archivo-YYYY-Qn.md` y dejar este vacío.

---

## Formato de entrada

```markdown
## YYYY-MM-DD — <autor: Santi|Socio> — <área: backend|frontend|infra|db|auth|...>
**Qué:** <qué cambió en 1-2 líneas>
**Por qué:** <motivación; requisito / bug / decisión>
**Problemas:** <errores que aparecieron y cómo se resolvieron; omitir si no hubo>
**Impacto para el otro:** <qué necesita saber la otra persona; omitir si no aplica>
**Refs:** <commits, archivos clave, PRs; opcional>
```

---

## Entradas

## 2026-04-20 — Santi — infra
**Qué:** agregado sistema de sincronización entre Claudes (DIARIO.md, ESTADO.md, 00-setup-claude.md) + endurecido CLAUDE.md con sección de coordinación entre devs.
**Por qué:** dos personas trabajando con dos Claudes distintos sobre el mismo repo; sin contexto compartido cada Claude re-descubre cosas ya resueltas y pisa convenciones.
**Problemas:** ninguno.
**Impacto para el otro:** socio tiene que correr el prompt de bootstrap (ver `instrucciones_claude/00-setup-claude.md`) la primera vez que abra Claude Code en este repo. A partir de ahí, su Claude va a leer estos archivos automáticamente al arrancar.
**Refs:** `CLAUDE.md`, `instrucciones_claude/00-setup-claude.md`, `instrucciones_claude/ESTADO.md`.

## 2026-04-20 — Santi — infra
**Qué:** docker-compose completo con frontend + nginx (dev y prod). Frontend Dockerfile usa `npm install` (no `npm ci`) y Node 22.
**Por qué:** levantar todo el stack con un solo `docker compose up`; prod sirve frontend+backend detrás de nginx en 80/443.
**Problemas:**
  1. `npm ci` falló porque el `package-lock.json` estaba desincronizado del `package.json` (faltaba `lucide-react@1.8.0` en el lock). Solución: pasar a `npm install` en el Dockerfile.
  2. Build TS falló con `TS1294 erasableSyntaxOnly`: `frontend/src/api/client.ts:4` usa parameter properties (`constructor(..., public status?: number)`) y el `tsconfig.app.json` tenía `erasableSyntaxOnly: true`. Solución temporal: sacar la flag del tsconfig.
**Impacto para el otro:** el SPA corre en http://localhost:5173 (dev). Vars VITE_* se inyectan en build-time, no en runtime. Si agregás deps nuevas al `package.json`, no hace falta regenerar el lock: `npm install` del Docker lo resuelve. Si querés reactivar `erasableSyntaxOnly`, primero hay que reescribir `client.ts` sin parameter properties.
**Refs:** `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml`, `frontend/Dockerfile`, `frontend/nginx.conf`, `nginx/`.

## 2026-04-20 — Santi — infra
**Qué:** simplificación grande del stack Docker: (1) consolidé las dos Postgres (`db` + `keycloak-db`) en una sola con la DB `keycloak` creada vía init script en `db/init/01-keycloak-db.sh`; (2) eliminé `docker-compose.override.yml` — la config de dev (puertos + keycloak `start-dev`) vive ahora en `docker-compose.yml`; (3) ports bindeados a `127.0.0.1` (no se exponen fuera del host); (4) saqué `HEALTHCHECK` de backend/frontend Dockerfiles, el `apk add wget tzdata` y el baile de zoneinfo; dejé solo el healthcheck del `db` (lo necesita `depends_on: condition: service_healthy` de keycloak/backend); (5) eliminé el `Makefile` — workflow directo con `docker compose ...`.
**Por qué:** el setup previo tenía demasiadas piezas para lo que es (dos Postgres, override auto-merge, healthchecks en todo). Más simple = más fácil de debuggear y menos puntos de falla.
**Problemas:** Docker Compose 2.12 no soporta `!reset` para arrays (se intentó antes). Solución adoptada: los puertos viven solo en el base y se bindean a localhost; el override de prod no los toca (nginx es la única capa pública en 80/443).
**Impacto para el otro:** (a) si ya habías levantado el stack antes, necesitás `docker compose down -v` para borrar el volumen viejo y que el init script cree la DB `keycloak`; (b) para levantar, correr directo `docker compose up -d --build` (no hay más `make up`); (c) Keycloak conecta a la misma Postgres que el app (user `imedba`, DB `keycloak`); (d) el frontend sigue sirviéndose desde `frontend/` con Node 22 + `npm install --no-audit --no-fund` (como lo dejaste).
**Refs:** `docker-compose.yml`, `docker-compose.prod.yml`, `db/init/01-keycloak-db.sh`, `frontend/Dockerfile`, `backend/Dockerfile`, `README.md`.

<!-- Nuevas entradas van ARRIBA de esta línea -->
