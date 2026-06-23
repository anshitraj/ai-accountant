# FinVerify React frontend
FROM node:22-alpine AS builder

WORKDIR /repo
RUN corepack enable

# Workspace install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/finverify-os ./artifacts/finverify-os

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/db run build || true
RUN pnpm --filter @workspace/api-zod run build || true
RUN pnpm --filter @workspace/finverify-os run build

FROM nginx:alpine
COPY --from=builder /repo/artifacts/finverify-os/dist/public /usr/share/nginx/html

# Reverse-proxy /api to go-api container (configurable via env at runtime)
RUN printf 'server {\n\
  listen 80;\n\
  location /api/ {\n\
    proxy_pass http://go-api:8090;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Host $host;\n\
  }\n\
  location / {\n\
    root /usr/share/nginx/html;\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
