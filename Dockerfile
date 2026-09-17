# --- builder ---------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* vars into the bundle at build time, not read at
# runtime — so they have to arrive as build args (docker-compose.yml
# passes these via the client service's `build.args`), not env_file.
ARG VITE_API_URL
ARG VITE_STOREFRONT_URL
ARG VITE_ROOT_DOMAIN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN

RUN npm run build

# --- runner ------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
