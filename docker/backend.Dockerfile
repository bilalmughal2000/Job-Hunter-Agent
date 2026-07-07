# ── Backend image (multi-stage, npm workspaces) ─────────────────────────────
# Build context is the repo root: `docker build -f docker/backend.Dockerfile .`

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ── deps: install with dev deps for the build ──
FROM base AS deps
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci --include=dev

# ── build: generate Prisma client, compile shared + backend to dist ──
FROM deps AS build
COPY shared ./shared
COPY backend ./backend
RUN npm run prisma:generate --workspace=@ajh/backend \
  && npm run build --workspace=shared \
  && npm run build --workspace=backend

# ── runtime: prod deps only + compiled output ──
FROM base AS runtime
ENV PORT=3000
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci --omit=dev
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
# Prisma engine + generated client (npm ci can't regenerate without the CLI).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/backend/prisma ./backend/prisma

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/dist/index.js"]
