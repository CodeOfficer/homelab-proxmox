#!/bin/bash
# Monitor mapshot render progress in real-time
# Usage: ./scripts/monitor-mapshot-render.sh [job-name]

set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/Users/codeofficer/homelab-proxmox/infrastructure/terraform/kubeconfig}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Find the most recent mapshot job
if [ -z "${1:-}" ]; then
  JOB_NAME=$(kubectl get jobs -n mapshot --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "")
  if [ -z "$JOB_NAME" ]; then
    echo -e "${RED}No mapshot jobs found${NC}"
    exit 1
  fi
  echo -e "${BLUE}Monitoring most recent job: $JOB_NAME${NC}"
else
  JOB_NAME="$1"
fi

# Get pod name
POD_NAME=$(kubectl get pods -n mapshot -l job-name="$JOB_NAME" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -z "$POD_NAME" ]; then
  echo -e "${RED}No pod found for job: $JOB_NAME${NC}"
  exit 1
fi

# Check pod status
POD_STATUS=$(kubectl get pod -n mapshot "$POD_NAME" -o jsonpath='{.status.phase}')
echo -e "${BLUE}Pod: $POD_NAME${NC}"
echo -e "${BLUE}Status: $POD_STATUS${NC}"
echo ""

# Function to count fresh tiles (modified in last 30 minutes)
count_tiles() {
  kubectl exec -n mapshot "$POD_NAME" -c render -- sh -c '
    if [ -d /mapshot/factorio/script-output/mapshot ]; then
      find /mapshot/factorio/script-output/mapshot -type f -name "tile_*.jpg" -mmin -30 2>/dev/null | wc -l
    else
      echo 0
    fi
  ' 2>/dev/null || echo "0"
}

# Function to get CPU utilization
get_cpu_usage() {
  kubectl top pod "$POD_NAME" -n mapshot --containers 2>/dev/null | grep render | awk '{print $2}' || echo "N/A"
}

# Function to get memory usage
get_memory_usage() {
  kubectl top pod "$POD_NAME" -n mapshot --containers 2>/dev/null | grep render | awk '{print $3}' || echo "N/A"
}

# Function to get render status from logs
get_render_status() {
  # Get the last few meaningful log lines
  kubectl logs -n mapshot "$POD_NAME" -c render --tail=20 2>/dev/null | grep -E "^\[|Script @|tiles to generate|screenshots started" | tail -3 || echo "Rendering in progress..."
}

echo -e "${GREEN}=== Real-Time Monitoring ===${NC}"
echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
echo ""

START_TIME=$(date +%s)
LAST_TILE_COUNT=0

# Monitor loop
while true; do
  # Clear previous output (move cursor up and clear lines)
  if [ "$LAST_TILE_COUNT" -gt 0 ]; then
    tput cuu 7  # Move up 7 lines (added ETA line)
    tput ed     # Clear from cursor to end
  fi

  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  ELAPSED_MIN=$((ELAPSED / 60))
  ELAPSED_SEC=$((ELAPSED % 60))

  # Get current metrics
  TILE_COUNT=$(count_tiles)
  CPU_USAGE=$(get_cpu_usage)
  MEM_USAGE=$(get_memory_usage)

  # Calculate tiles per minute
  if [ "$ELAPSED" -gt 0 ] && [ "$TILE_COUNT" -gt 0 ]; then
    TILES_PER_MIN=$(echo "scale=1; $TILE_COUNT * 60 / $ELAPSED" | bc)
  else
    TILES_PER_MIN="0.0"
  fi

  # Calculate total tiles dynamically (count all tiles including old ones)
  # This gives us the actual total for this render's detail level
  TOTAL_TILES=$(kubectl exec -n mapshot "$POD_NAME" -c render -- sh -c '
    if [ -d /mapshot/factorio/script-output/mapshot ]; then
      find /mapshot/factorio/script-output/mapshot -type f -name "tile_*.jpg" 2>/dev/null | wc -l
    else
      echo 0
    fi
  ' 2>/dev/null || echo "0")

  # Estimate completion based on current tile count
  if [ "$TILE_COUNT" -gt 0 ] && [ "$TILES_PER_MIN" != "0.0" ]; then
    # If tiles stopped increasing, we're probably done
    if [ "$TOTAL_TILES" -eq "$TILE_COUNT" ]; then
      ETA_TEXT="Finalizing..."
    else
      # Estimate remaining time (assume tiles will keep increasing at current rate)
      # This is a rough estimate - we don't know the final count until render finishes
      ETA_TEXT="In progress..."
    fi
  else
    ETA_TEXT="Calculating..."
  fi

  # Display metrics
  echo -e "${GREEN}Elapsed:${NC} ${ELAPSED_MIN}m ${ELAPSED_SEC}s  ${YELLOW}Status:${NC} $ETA_TEXT"
  echo -e "${GREEN}Fresh tiles:${NC} $TILE_COUNT (${TILES_PER_MIN}/min)  ${GREEN}Total generated:${NC} $TOTAL_TILES"
  echo -e "${GREEN}CPU:${NC} ${CPU_USAGE}  ${GREEN}Memory:${NC} ${MEM_USAGE}"
  echo ""
  echo -e "${YELLOW}Recent logs:${NC}"
  get_render_status

  LAST_TILE_COUNT=$TILE_COUNT

  # Check if pod is still running
  CURRENT_STATUS=$(kubectl get pod -n mapshot "$POD_NAME" -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
  if [ "$CURRENT_STATUS" != "Running" ] && [ "$CURRENT_STATUS" != "Pending" ]; then
    echo ""
    echo -e "${RED}Pod status changed to: $CURRENT_STATUS${NC}"
    echo ""
    echo -e "${YELLOW}Final logs:${NC}"
    kubectl logs -n mapshot "$POD_NAME" -c render --tail=20 2>/dev/null || true
    break
  fi

  sleep 3
done

echo ""
echo -e "${BLUE}=== Final Stats ===${NC}"
echo -e "${GREEN}Total tiles generated:${NC} $TOTAL_TILES"
echo -e "${GREEN}Total time:${NC} ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
if [ "$TILE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}Average rate:${NC} ${TILES_PER_MIN} tiles/min"
fi
echo ""
echo -e "${YELLOW}Check web output:${NC} https://mapshot.codeofficer.com/"
