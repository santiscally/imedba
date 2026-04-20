# syntax=docker/dockerfile:1.7
# Build del SPA (React + Vite) y servido con nginx:alpine.
# Vars VITE_* se inyectan en build-time (Vite no las lee en runtime).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_KEYCLOAK_URL=/auth
ARG VITE_KEYCLOAK_REALM=imedba
ARG VITE_KEYCLOAK_CLIENT_ID=imedba-frontend
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL} \
    VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM} \
    VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
