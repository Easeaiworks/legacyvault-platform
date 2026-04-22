FROM node:20.11-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --include=dev

FROM deps AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
COPY . .
RUN npx turbo run build --filter=@legacyvault/web

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=app:app /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=app:app /app/apps/web/package.json ./apps/web/
COPY --from=builder --chown=app:app /app/apps/web/next.config.mjs ./apps/web/
COPY --from=builder --chown=app:app /app/packages ./packages
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
USER app
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]
