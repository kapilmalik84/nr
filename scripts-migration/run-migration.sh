#!/usr/bin/env bash
# run-migration.sh — Run the full migration pipeline without needing Claude.
#
# Usage:
#   bash run-migration.sh                    # migrate all urls-not-started.txt
#   bash run-migration.sh urls-remaining.txt # migrate specific file
#   nohup bash run-migration.sh > migration-run-$(date +%Y%m%d-%H%M%S).log 2>&1 &
#
# Prerequisites:
#   - .hlx/.da-token.json must have a valid (non-expired) access_token
#   - pip install requests (already installed if migrate.py has been used)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TOKEN_FILE="$REPO_ROOT/.hlx/.da-token.json"
LOG_DATE="$(date +%Y%m%d-%H%M%S)"
RUN_LOG="$SCRIPT_DIR/migration-run-${LOG_DATE}.log"
URL_FILE="${1:-$SCRIPT_DIR/urls-not-started.txt}"

echo "=== AusPost Newsroom Migration ==="
echo "Started: $(date)"
echo "URL file: $URL_FILE"
echo "Log: $RUN_LOG"
echo ""

# ---------- Token check ----------
if [ ! -f "$TOKEN_FILE" ]; then
  echo "ERROR: Token file not found at $TOKEN_FILE"
  echo "Please log into da.live and export the token."
  exit 1
fi

EXPIRES_AT=$(python3 -c "import json; d=json.load(open('$TOKEN_FILE')); print(int(d['expires_at']/1000))")
NOW=$(date +%s)
if [ "$EXPIRES_AT" -le "$NOW" ]; then
  echo "ERROR: DA token is expired (expired at $(date -d @$EXPIRES_AT 2>/dev/null || date -r $EXPIRES_AT 2>/dev/null || echo $EXPIRES_AT))"
  echo "Please log into da.live and refresh .hlx/.da-token.json"
  exit 1
fi
EXPIRES_IN=$(( EXPIRES_AT - NOW ))
echo "Token valid for: $((EXPIRES_IN / 3600))h $(( (EXPIRES_IN % 3600) / 60 ))m"

# ---------- URL file check ----------
if [ ! -f "$URL_FILE" ]; then
  echo "ERROR: URL file not found: $URL_FILE"
  exit 1
fi

TOTAL=$(grep -c . "$URL_FILE" || true)
echo "URLs to migrate: $TOTAL"
echo ""

# ---------- Upload footer assets (idempotent) ----------
echo "--- Uploading footer assets to DA.live ---"
python3 "$SCRIPT_DIR/upload_footer_assets.py" 2>&1 | tee -a "$RUN_LOG" || echo "WARNING: footer asset upload failed, continuing..."
echo ""

# ---------- Run migration in batches ----------
BATCH=50
START=0
while [ "$START" -lt "$TOTAL" ]; do
  REMAINING=$(( TOTAL - START ))
  COUNT=$(( REMAINING < BATCH ? REMAINING : BATCH ))
  echo "--- Batch: articles $((START+1)) to $((START+COUNT)) of $TOTAL ---"
  python3 "$SCRIPT_DIR/migrate.py" \
    --list "$URL_FILE" \
    --start "$START" \
    --limit "$COUNT" \
    --sleep 1.5 \
    2>&1 | tee -a "$RUN_LOG"
  START=$(( START + COUNT ))
  if [ "$START" -lt "$TOTAL" ]; then
    echo "Pausing 5s between batches..."
    sleep 5
  fi
done

echo ""
echo "=== Migration complete ==="
echo "Finished: $(date)"
echo "Log file: $RUN_LOG"
echo "Next: run validate.py to check results"
