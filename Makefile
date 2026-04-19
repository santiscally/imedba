# Makefile — atajos para el stack IMEDBA. Requiere Docker y GNU Make.
# Uso: make <target>

SHELL := /usr/bin/env bash

COMPOSE ?= docker compose
PROJECT ?= imedba

.PHONY: help up up-build down destroy logs ps health \
        backend-logs backend-shell backend-dev backend-test backend-test-docker \
        psql kc-shell kc-logs \
        prune

help:
	@echo "Targets:"
	@echo "  up            - levanta el stack (detached, build si hace falta)"
	@echo "  up-build      - fuerza rebuild de imágenes y sube"
	@echo "  down          - baja el stack (conserva volúmenes)"
	@echo "  destroy       - baja y borra volúmenes (reset total)"
	@echo "  logs          - tail de logs de todos los servicios"
	@echo "  ps            - estado de los contenedores"
	@echo "  health        - curl a /actuator/health del backend"
	@echo "  backend-logs  - logs del backend"
	@echo "  backend-shell - shell dentro del backend"
	@echo "  backend-dev   - corre el backend con perfil dev fuera de Docker"
	@echo "  backend-test  - corre los tests (requiere Java 21 local)"
	@echo "  backend-test-docker - idem pero dentro de un container Java 21"
	@echo "  psql          - shell psql contra la DB de la app"
	@echo "  kc-shell      - shell dentro del contenedor de Keycloak"
	@echo "  kc-logs       - logs de Keycloak"
	@echo "  prune         - docker system prune (limpia imágenes huérfanas)"

up:
	$(COMPOSE) up -d

up-build:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

destroy:
	$(COMPOSE) down -v --remove-orphans

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

health:
	@curl -fsS http://localhost:$${BACKEND_PORT:-8080}/actuator/health | jq . || true

backend-logs:
	$(COMPOSE) logs -f --tail=200 backend

backend-shell:
	$(COMPOSE) exec backend sh

backend-dev:
	cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

backend-test:
	cd backend && ./mvnw test

# Tests corriendo dentro de Docker (Java 21 no requerido localmente).
# Monta el socket de Docker para que Testcontainers pueda spawnear el Postgres
# de tests. Ryuk se deshabilita porque no funciona en Docker-in-Docker sobre Win.
backend-test-docker:
	cd backend && MSYS_NO_PATHCONV=1 docker run --rm --network host \
		-e TESTCONTAINERS_RYUK_DISABLED=true \
		-e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
		-v "$$(pwd -W 2>/dev/null || pwd):/app" -w //app \
		-v imedba-maven-repo:/root/.m2 \
		-v //var/run/docker.sock://var/run/docker.sock \
		eclipse-temurin:21-jdk-alpine \
		sh -c "apk add --no-cache maven docker-cli >/dev/null && mvn test"

psql:
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-imedba} -d $${POSTGRES_DB:-imedba}

kc-shell:
	$(COMPOSE) exec keycloak sh

kc-logs:
	$(COMPOSE) logs -f --tail=200 keycloak

prune:
	docker system prune -f
