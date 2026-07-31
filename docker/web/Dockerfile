FROM node:22-alpine AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/data-model/package.json packages/data-model/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/scoring/package.json packages/scoring/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages/data-model packages/data-model
COPY packages/schemas packages/schemas
COPY packages/scoring packages/scoring

RUN pnpm --filter @aluevaaka/web... clean && pnpm --filter @aluevaaka/web... build

FROM nginx:1.27-alpine

COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
