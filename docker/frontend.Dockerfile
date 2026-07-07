# ── Frontend image (placeholder until Phase 7) ──────────────────────────────
# The Angular app is scaffolded in Phase 7. This multi-stage build compiles it
# and serves the static bundle via nginx. Build context is the repo root:
#   docker build -f docker/frontend.Dockerfile .

FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/ ./
# The skeleton has no Angular app yet; guarantee a dist/ exists so the runtime
# stage copies successfully before Phase 7 lands.
RUN if [ -f package.json ]; then npm ci && npm run build; fi; mkdir -p dist

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
