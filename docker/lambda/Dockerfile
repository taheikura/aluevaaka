FROM node:22-alpine AS build

WORKDIR /workspace

RUN apk add --no-cache zip \
	&& corepack enable \
	&& corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services/recommendation/package.json services/recommendation/package.json
COPY packages/data-model/package.json packages/data-model/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/scoring/package.json packages/scoring/package.json

RUN pnpm install --frozen-lockfile

COPY services/recommendation services/recommendation
COPY packages/data-model packages/data-model
COPY packages/schemas packages/schemas
COPY packages/scoring packages/scoring

RUN pnpm --filter @aluevaaka/recommendation... clean && pnpm --filter @aluevaaka/recommendation... build

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build /workspace/services/recommendation/bundle/ ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
