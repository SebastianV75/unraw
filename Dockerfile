# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Install from the monorepo root and cache dependencies separately from source.
COPY package.json yarn.lock ./
COPY web/package.json ./web/package.json
COPY docs/package.json ./docs/package.json
RUN yarn install --frozen-lockfile --non-interactive

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY web ./web

# Only public browser configuration belongs in build arguments.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
RUN : "${NEXT_PUBLIC_APP_URL:?Set NEXT_PUBLIC_APP_URL as a build variable}" \
      "${NEXT_PUBLIC_SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL as a build variable}" \
      "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Set NEXT_PUBLIC_SUPABASE_ANON_KEY as a build variable}" \
    && yarn workspace web build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=node:node /app/web/public ./web/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:3000/favicon.svg',r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "web/server.js"]
