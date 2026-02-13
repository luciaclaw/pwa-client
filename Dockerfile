# Multi-stage build: SvelteKit static PWA → nginx
# Build context is the CI workspace root (contains pwa-client/ and platform-protocol/).

# --- Stage 1: Build SvelteKit app ---
FROM node:22-slim AS build

# Build protocol dependency from source
WORKDIR /build/protocol
COPY platform-protocol/package.json platform-protocol/tsconfig.json ./
COPY platform-protocol/src ./src
RUN npm install && npm run build

# Build PWA
WORKDIR /build/app
COPY pwa-client/package.json ./
# Rewrite protocol dep to point to local build
RUN node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8'));p.dependencies['@luciaclaw/protocol']='file:/build/protocol';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))"
RUN npm install

COPY pwa-client/svelte.config.js pwa-client/vite.config.ts pwa-client/tsconfig.json ./
COPY pwa-client/src ./src
COPY pwa-client/static ./static
RUN npm run build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

COPY pwa-client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/app/build /usr/share/nginx/html

EXPOSE 80
