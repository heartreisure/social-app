#!/usr/bin/env bash
set -euo pipefail

INTERVAL="${GSE_DASHBOARD_TICK_SECONDS:-30}"
GSE_TOOL="$(cat "$HOME/.gse-one")/tools/dashboard.py"
LOG_FILE="${GSE_DASHBOARD_TICK_LOG:-/tmp/gse-dashboard-tick.log}"

echo "[dashboard-tick] starting — interval=${INTERVAL}s, tool=${GSE_TOOL}" >> "$LOG_FILE"

while true; do
  python3 "$GSE_TOOL" --if-stale >> "$LOG_FILE" 2>&1 || true
  sleep "$INTERVAL"
done
