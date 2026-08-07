# Aluevaaka

[![Deploy](https://github.com/taheikura/aluevaaka/actions/workflows/deploy.yml/badge.svg)](https://github.com/taheikura/aluevaaka/actions/workflows/deploy.yml)
[![Data pipeline](https://github.com/taheikura/aluevaaka/actions/workflows/data-pipeline.yml/badge.svg)](https://github.com/taheikura/aluevaaka/actions/workflows/data-pipeline.yml)

Finnish municipality recommendation platform. Enter your preferences for housing, healthcare, transport, nature, and economic outlook — get ranked municipalities with explainable scores, category breakdowns, and a map view.

**Live demo:** _link added after first deployment_

---

## Architecture

```
Browser → CloudFront → S3 (static frontend)
Browser → Lambda Function URL → Recommendation Lambda → S3 (generated datasets)
GitHub Actions → CDK → AWS infrastructure
GitHub Actions → S3 (datasets + frontend) → Lambda (function code update)
```

CI builds the Lambda and frontend artifacts once. A successful CI run on
`main` triggers deployment, which downloads those exact artifacts and promotes
them to the selected environment. Deployment does not rebuild the Lambda or
frontend. The frontend contains a placeholder API URL during CI; deployment
replaces only that environment-specific value before uploading the otherwise
tested artifact.

All infrastructure is serverless. No EC2, no RDS, no NAT Gateway, no always-on workers. Idle cost is near zero (storage + log retention only).

### Key decisions

| Decision | Reason |
|---|---|
| Lambda Function URL instead of API Gateway | One endpoint is sufficient for MVP; avoids extra config and per-request charges |
| S3 + CloudFront for frontend | Static hosting, zero operational overhead |
| Batch-generated S3 datasets instead of a database | Read-heavy recommendations don't need an always-on database |
| ARM64 (Graviton2) Lambda | ~20% cheaper than x86 at identical performance |
| Deterministic weighted scoring | Explainable, testable, no ML complexity |
| OIDC for GitHub Actions | No long-lived AWS credentials stored in secrets |
| CDK in TypeScript | Same language as the rest of the stack |

To migrate from Lambda Function URL to API Gateway: update `infrastructure/src/stacks/aluevaaka-stack.ts` — the Lambda handler code is unchanged.

---

## Repository structure

```
aluevaaka/
├── apps/
│   └── web/                    # React + Vite frontend
├── services/
│   └── recommendation/         # Lambda handler
├── packages/
│   ├── data-model/             # Shared TypeScript types (no runtime deps)
│   ├── schemas/                # Zod schemas — API contract, derived TS types
│   └── scoring/                # Deterministic scoring engine + unit tests
├── scripts/
│   └── src/
│       ├── sources/            # One file per data source adapter
│       ├── lib/                # Logger, quality checks, HTTP helpers
│       ├── generate.ts         # Merge + quality check + write data/generated/
│       ├── pipeline.ts         # Entry point: fetch → generate
│       ├── validate.ts         # Validate existing data/generated/ without re-fetching
│       ├── upload.ts           # Upload data/generated/ to S3
│       └── seed-sample.ts      # Write 10-municipality sample for local dev
├── data/
│   ├── raw/                    # Downloaded source files (gitignored)
│   └── generated/              # Pipeline output (gitignored)
├── infrastructure/
│   └── src/
│       ├── bin/app.ts          # CDK app entry point
│       ├── config.ts           # Per-environment configuration
│       ├── stacks/             # Top-level CloudFormation stack
│       └── constructs/         # Storage, Lambda, CloudFront, CI identity, observability
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR checks: typecheck, lint, test, build, cdk synth
│       ├── deploy.yml          # Promote successful CI artifacts to AWS
│       ├── smoke-test.yml      # Reusable: health + recommendation + error handling
│       └── data-pipeline.yml   # Weekly dataset refresh (or manual)
└── DESIGN.md
```

---

## Local development

### Prerequisites

- Node.js ≥ 24
- pnpm ≥ 9 (`npm i -g pnpm`)
- AWS CLI (for deployment and data upload)
- AWS CDK (`npm i -g aws-cdk`)

### First-time setup

```bash
pnpm install
```

`pnpm install` also installs the repository's Git pre-commit hook. Before a
commit, the hook runs Biome on staged files, then the workspace type checks and
unit tests. This catches most CI failures locally. If hooks are skipped because
dependencies were already installed, run `pnpm install` again.

Run the same checks manually at any time:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Biome is the only JavaScript/TypeScript lint-and-format tool used by this
repository. Use `pnpm format` to apply formatting and `pnpm format:check` to
check formatting without modifying files.

### Seed sample data (no API access needed)

```bash
pnpm --filter @aluevaaka/scripts seed:sample
```

This writes 10 Finnish municipalities to `data/generated/` so the Lambda and frontend work immediately.

### Run the frontend

```bash
# In one terminal — start a local Lambda emulator or use the deployed Function URL
# then set VITE_API_PROXY_TARGET accordingly

cp apps/web/.env.example apps/web/.env.local
# Edit VITE_API_URL or VITE_API_PROXY_TARGET

pnpm --filter @aluevaaka/web dev
# Opens at http://localhost:5173
```

## Local development

The Lambda runs locally inside the official AWS runtime Docker image — no SAM CLI or LocalStack account required. The image ships with the Lambda Runtime Interface Emulator (RIE), which accepts invocations over HTTP exactly as the real Lambda service does.

### Prerequisites

- Docker (running)
- pnpm (already installed)

### Workflow

```bash
# 1. Seed sample data (10 Finnish municipalities, no network calls)
pnpm --filter @aluevaaka/scripts seed:sample

# 2. Compile the Lambda handler
pnpm dev:build

# 3. Pull the runtime image once (~600 MB, cached after first run)
pnpm dev:lambda:pull

# 4. Start the Lambda container
pnpm dev:lambda
# Container is running at http://localhost:9000

# 5. In a separate terminal, test it
pnpm dev:health
pnpm dev:recommend
```

### How it works

`docker/lambda-local.sh` runs:

```bash
docker run \
  -p 9000:8080 \
  -v services/recommendation/dist:/var/task:ro \  # compiled handler
  -v data/generated:/var/data:ro \                # sample dataset
  -e DATA_BUCKET=local \                          # filesystem read path
  -e DATA_PREFIX=/var/data \
  public.ecr.aws/lambda/nodejs:22 \
  index.handler
```

The RIE listens on port 8080 inside the container (mapped to 9000 on your host). Invoke it with:

```bash
curl -s http://localhost:9000/2015-03-31/functions/function/invocations \
  -d @events/health.json | python3 -m json.tool
```

### Custom invocations

```bash
# Edit events/recommend.json to change preferences, then:
./docker/lambda-local.sh recommend

# Or pass preferences inline:
./docker/lambda-local.sh recommend '{"housingAffordability":0.8,"natureAndRecreation":0.2}'
```

### Docker Compose development stack

For a reproducible local stack, use Docker Compose. It builds the Lambda runtime, a small local HTTP adapter that translates `/health` and `/recommendations` into Lambda Runtime Interface Emulator invocations, and an Nginx-served frontend:

```bash
pnpm --filter @aluevaaka/scripts seed:sample
pnpm dev:build
pnpm dev:compose
```

Open `http://localhost:8080`. The local services are exposed separately for debugging:

- Frontend: `http://localhost:8080`
- Local HTTP adapter: `http://localhost:3000`
- Lambda Runtime Interface Emulator: `http://localhost:9000`

Stop the stack with:

```bash
pnpm dev:compose:down
```

The Compose stack is for local development only. Production continues to use the CDK-managed Lambda Function URL directly; the local HTTP adapter is not deployed.

### Connecting the frontend to the local Lambda

The RIE exposes a raw invoke endpoint, not a routed HTTP API — so the Vite proxy can't call it transparently for the frontend. Two options:

**Option A — Point the frontend at your deployed Function URL** (simplest):

```bash
# apps/web/.env.local
VITE_API_URL=https://<your-deployed-function-url>
pnpm dev:web
```

**Option B — SAM CLI for full HTTP routing** (needs SAM CLI installed):

```bash
# Install once: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
# macOS: brew install aws-sam-cli

pnpm dev:api    # sam local start-api on localhost:3000
pnpm dev:web    # Vite proxies /api → localhost:3000
```

SAM uses the same `public.ecr.aws/lambda/nodejs:22` image — the only addition is HTTP routing via `template.yaml`.

### Iterating on code

After changing any TypeScript:

```bash
pnpm dev:build   # recompile dist/
# Volume mount means the next invocation picks up changes immediately
```

### How local data loading works

When `DATA_BUCKET=local`, the handler reads JSON files from the local filesystem path in `DATA_PREFIX` instead of calling S3. The same code path runs unchanged in production — only the transport differs.

## Data pipeline

### Run the full pipeline

Downloads data from Statistics Finland open APIs and writes `data/generated/`:

```bash
pnpm --filter @aluevaaka/scripts pipeline
```

### Validate existing data

```bash
pnpm --filter @aluevaaka/scripts validate
```

### Upload to S3

```bash
DATA_BUCKET=aluevaaka-data-production-<account-id> \
pnpm --filter @aluevaaka/scripts upload
```

### Data sources

| Metric | Source | License |
|---|---|---|
| Municipality boundaries and names | Statistics Finland WFS (geo.stat.fi) | CC BY 4.0 |
| Population | Statistics Finland PxWeb (11re) | CC BY 4.0 |
| Median household income | Statistics Finland PxWeb (11y9) | CC BY 4.0 |
| Unemployment rate | Statistics Finland PxWeb (12b9) | CC BY 4.0 |
| Net migration | Statistics Finland PxWeb (119z) | CC BY 4.0 |
| Housing price per m² | Statistics Finland PxWeb (11ls) | CC BY 4.0 |

OSM-derived healthcare, transport, grocery, school, library, and nature distances are precomputed during the data refresh. Lambda only queries the generated S3 snapshot; it does not call Overpass or process the raw PBF.

### Low-cost GIS-friendly storage

The project deliberately uses S3 rather than a database. The refresh produces stable, versioned JSON objects including `map-index.json` and `map-manifest.json`. These fields are intentionally simple so the records can later be converted to Parquet and registered in Athena without changing the application model. Athena is not part of the runtime path.

The browser calls Lambda for preference-specific scoring and viewport filtering. A future optimization can publish static zoom tiles to S3/CloudFront using the same H3 records, while keeping the current S3-only architecture and near-zero idle cost.

---

## Deployment

### First-time setup

1. Create an AWS account and enable billing alerts.

2. Bootstrap CDK in your account:

```bash
cdk bootstrap aws://<account-id>/eu-north-1
```

3. Create the GitHub OIDC provider in IAM (one-time per account):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

4. Deploy the CDK stack to create all infrastructure including the CI/CD role:

```bash
cd infrastructure
pnpm install
pnpm build

# Create a placeholder Lambda bundle so CDK asset upload works
mkdir -p ../services/recommendation/bundle
echo 'export const handler = async () => ({ statusCode: 200, body: "pending" });' \
  > ../services/recommendation/bundle/index.mjs

cdk deploy \
  --context env=production \
  --context alertEmail=you@example.com \
  --context githubRepo=yourname/aluevaaka
```

5. Note the `DeployRoleArn` output and add it to GitHub repository secrets:

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN_PROD` | ARN from CDK output `DeployRoleArn` |
| `AWS_DEPLOY_ROLE_ARN_DEV` | ARN from dev stack (if using a dev environment) |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `ALERT_EMAIL` | Email for CloudWatch and budget alerts |

6. Push to `main` — the deploy workflow runs automatically.

### Deploying manually

```bash
# From infrastructure/
cdk deploy \
  --context env=production \
  --context alertEmail=you@example.com \
  --context githubRepo=yourname/aluevaaka
```

### Environments

| Environment | Branch | Description |
|---|---|---|
| `development` | any | Temporary resources, DESTROY removal policy, short log retention |
| `production` | `main` only | RETAIN removal policy, 90-day logs, tighter OIDC trust |

---

## Infrastructure cost estimate

With zero users, expected monthly cost in `eu-north-1`:

| Service | Estimate |
|---|---|
| S3 storage (< 1 GB) | < $0.03 |
| CloudFront (< 1 GB transfer) | < $0.10 |
| Lambda (zero invocations) | $0.00 |
| CloudWatch logs (7–90 day retention) | < $0.50 |
| Route 53 hosted zone (if custom domain) | $0.50 |
| **Total idle** | **< $1.20 / month** |

Budget alerts are configured at $10/month (development) and $20/month (production) — you will receive email warnings before unexpected charges reach the threshold.

---

## Observability

- **CloudWatch Dashboard:** `aluevaaka-production` — invocations, errors, p50/p95 duration, throttles
- **CloudWatch Alarms:** error rate > 5 in 5 min, throttles > 3 in 5 min, p95 duration > 80% of timeout
- **Alarms route to SNS** → email (configured via `alertEmail` context)
- **Structured Lambda logs** in JSON — queryable with CloudWatch Logs Insights:

```
fields @timestamp, level, msg, durationMs, resultCount
| filter level = "ERROR"
| sort @timestamp desc
| limit 20
```

- **Active monitoring:** smoke tests run on every deploy and twice daily via the scheduled workflow

---

## Adding a new data source

1. Create `scripts/src/sources/<name>.ts` following the pattern in `statistics.ts`:
   - Export a typed result interface and a `fetch*()` async function
   - Return `{ records, provenance }` — never throw silently
2. Add the relevant fields to `MunicipalityMetrics` in `packages/data-model/src/municipality.ts`
3. Wire the new source into `scripts/src/generate.ts` (fetch in parallel, merge by municipality ID)
4. Add quality checks in `generate.ts` for the new fields
5. Add scoring logic in `packages/scoring/src/engine.ts`
6. Add a category score function and wire it into `rankMunicipalities`

---

## Limitations

- Recommendations reflect publicly available statistics, not real-time conditions.
- Housing price data has limited coverage for small municipalities (< 2 000 residents).
- Healthcare, transport, grocery, school, library, and nature distances are precomputed in the refresh pipeline.
- Scores represent match against *your weighted preferences*, not objective quality rankings.
- Dataset is refreshed monthly from the Geofabrik OSM extract and can also be refreshed manually.
