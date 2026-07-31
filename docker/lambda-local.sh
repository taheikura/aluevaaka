#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Run the recommendation Lambda locally using the official AWS Lambda
# runtime image — no SAM CLI installation required, just Docker.
#
# The image includes the Lambda Runtime Interface Emulator (RIE) which
# exposes the same HTTP API as the real Lambda service at localhost:9000.
#
# Usage:
#   ./docker/lambda-local.sh          # start the container (foreground)
#   ./docker/lambda-local.sh health   # invoke GET /health (new terminal)
#   ./docker/lambda-local.sh recommend # invoke POST /recommendations
#   ./docker/lambda-local.sh stop     # stop the running container
#
# Prerequisites:
#   1. pnpm dev:build        (compiles TS to services/recommendation/dist/)
#   2. pnpm seed:sample      (writes data/generated/*.json)
#   3. Docker running
# ---------------------------------------------------------------------------
set -euo pipefail

IMAGE="public.ecr.aws/lambda/nodejs:22"
CONTAINER_NAME="aluevaaka-lambda-local"
HOST_PORT=9000
# RIE always listens on 8080 inside the container
CONTAINER_PORT=8080
INVOKE_URL="http://localhost:${HOST_PORT}/2015-03-31/functions/function/invocations"

# Absolute paths so the script works from any cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/services/recommendation/dist"
DATA_DIR="$PROJECT_ROOT/data/generated"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
check_prereqs() {
  if [ ! -d "$DIST_DIR" ] || [ -z "$(ls -A "$DIST_DIR" 2>/dev/null)" ]; then
    echo "ERROR: $DIST_DIR is empty. Run: pnpm dev:build"
    exit 1
  fi
  if [ ! -f "$DATA_DIR/dataset-manifest.json" ]; then
    echo "ERROR: No dataset found at $DATA_DIR. Run: pnpm --filter @aluevaaka/scripts seed:sample"
    exit 1
  fi
}

start_container() {
  # Stop any previous instance
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

  echo "Pulling Lambda runtime image (cached after first run)..."
  docker pull "$IMAGE" --quiet

  echo ""
  echo "Starting Lambda container at http://localhost:${HOST_PORT}"
  echo "Invoke endpoint: $INVOKE_URL"
  echo "Press Ctrl+C to stop."
  echo ""

  docker run \
    --name "$CONTAINER_NAME" \
    --rm \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    -v "$DIST_DIR":/var/task:ro \
    -v "$DATA_DIR":/var/data:ro \
    -e DATA_BUCKET=local \
    -e DATA_PREFIX=/var/data \
    -e ALLOWED_ORIGINS="http://localhost:5173" \
    -e SERVICE_VERSION=local \
    -e NODE_OPTIONS="--enable-source-maps" \
    -e AWS_DEFAULT_REGION=eu-north-1 \
    "$IMAGE" \
    index.handler
}

invoke() {
  local payload="$1"
  if ! curl -s "http://localhost:${HOST_PORT}/_localstack/health" &>/dev/null; then
    # Check the RIE is up
    if ! curl -s --max-time 2 "$INVOKE_URL" -d '{}' &>/dev/null; then
      echo "ERROR: Lambda container is not running. Start it first: ./docker/lambda-local.sh"
      exit 1
    fi
  fi

  curl --silent --fail-with-body \
    --request POST \
    --header "Content-Type: application/json" \
    --data "$payload" \
    "$INVOKE_URL" | python3 -m json.tool
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
COMMAND="${1:-start}"

case "$COMMAND" in
  start)
    check_prereqs
    start_container
    ;;

  health)
    invoke '{
      "version":"2.0",
      "routeKey":"GET /health",
      "rawPath":"/health",
      "rawQueryString":"",
      "headers":{"host":"localhost:9000"},
      "requestContext":{
        "http":{"method":"GET","path":"/health","protocol":"HTTP/1.1","sourceIp":"127.0.0.1","userAgent":"lambda-local"},
        "accountId":"000000000000","apiId":"local","domainName":"localhost",
        "domainPrefix":"local","requestId":"local-1","routeKey":"GET /health",
        "stage":"$default","time":"30/Jul/2026:00:00:00 +0000","timeEpoch":1753228800000
      },
      "isBase64Encoded":false
    }'
    ;;

  recommend)
    PREFS="${2:-{\"housingAffordability\":0.4,\"healthcareAccess\":0.2,\"transportConnectivity\":0.2,\"natureAndRecreation\":0.2,\"economicOutlook\":0,\"services\":0}}"
    BODY="{\"preferences\":$PREFS,\"limit\":5}"
    ESCAPED_BODY=$(printf '%s' "$BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
    invoke "{
      \"version\":\"2.0\",
      \"routeKey\":\"POST /recommendations\",
      \"rawPath\":\"/recommendations\",
      \"rawQueryString\":\"\",
      \"headers\":{\"host\":\"localhost:9000\",\"content-type\":\"application/json\"},
      \"requestContext\":{
        \"http\":{\"method\":\"POST\",\"path\":\"/recommendations\",\"protocol\":\"HTTP/1.1\",\"sourceIp\":\"127.0.0.1\",\"userAgent\":\"lambda-local\"},
        \"accountId\":\"000000000000\",\"apiId\":\"local\",\"domainName\":\"localhost\",
        \"domainPrefix\":\"local\",\"requestId\":\"local-2\",\"routeKey\":\"POST /recommendations\",
        \"stage\":\"\$default\",\"time\":\"30/Jul/2026:00:00:00 +0000\",\"timeEpoch\":1753228800000
      },
      \"body\":$ESCAPED_BODY,
      \"isBase64Encoded\":false
    }"
    ;;

  stop)
    docker rm -f "$CONTAINER_NAME" 2>/dev/null && echo "Container stopped." || echo "Container was not running."
    ;;

  pull)
    echo "Pulling $IMAGE..."
    docker pull "$IMAGE"
    ;;

  *)
    echo "Usage: $0 [start|health|recommend|stop|pull]"
    echo ""
    echo "  start      Start the Lambda container (foreground, Ctrl+C to stop)"
    echo "  health     Invoke GET /health against the running container"
    echo "  recommend  Invoke POST /recommendations (optional: pass preferences JSON as \$2)"
    echo "  stop       Stop the running container"
    echo "  pull       Pre-pull the runtime image"
    echo ""
    echo "Example:"
    echo "  $0 recommend '{\"housingAffordability\":0.8,\"natureAndRecreation\":0.2}'"
    ;;
esac
