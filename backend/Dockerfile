# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Etapa 1: build con Maven + JDK 21
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace

# Copiamos wrapper + pom primero para aprovechar el cache de capas de Docker.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Pre-descarga dependencias. `go-offline` requiere deps estables — si falla (por ej.
# plugin recién referenciado) lo ignoramos y seguirá descargando en el `package`.
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -q -DskipTests dependency:go-offline || true

COPY src/ src/

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -q -DskipTests package \
 && cp target/imedba-backend.jar /workspace/app.jar

# -----------------------------------------------------------------------------
# Etapa 2: runtime con JRE slim + usuario no root
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runtime

# wget se usa para el HEALTHCHECK del contenedor.
RUN apk add --no-cache wget tzdata \
 && cp /usr/share/zoneinfo/America/Argentina/Buenos_Aires /etc/localtime \
 && echo "America/Argentina/Buenos_Aires" > /etc/timezone

RUN addgroup -S imedba && adduser -S -G imedba imedba

WORKDIR /app
COPY --from=build --chown=imedba:imedba /workspace/app.jar /app/app.jar

USER imedba
EXPOSE 8080

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=50 -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=10 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
