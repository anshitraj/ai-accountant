# FinVerify TypeScript API fallback
FROM node:22-alpine AS builder

WORKDIR /repo

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace files needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install
RUN pnpm install --frozen-lockfile

# Build TypeScript references then bundle
RUN pnpm --filter @workspace/db run build || true
RUN pnpm --filter @workspace/api-zod run build || true
RUN pnpm --filter @workspace/api-server run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /repo/artifacts/api-server/dist ./dist
COPY --from=builder /repo/artifacts/api-server/package.json ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
