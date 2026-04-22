FROM node:20.11-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl tini

FROM base AS deps
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --include=dev

FROM deps AS builder
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx turbo run build --filter=@legacyvault/worker

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=app:app /app/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=app:app /app/packages ./packages
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/worker/dist/main.js"]
