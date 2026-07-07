# ── Frontend image: build the Angular app, serve via nginx ──────────────────
# Build context is the repo root:
#   docker build -f docker/frontend.Dockerfile .

FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Angular 19 emits the browser bundle under dist/<project>/browser.
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
