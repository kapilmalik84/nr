#!/usr/bin/env bash
# Full DA reset + re-migration to year-based folder structure.
#
# Steps:
#   1. Delete all old DA article content (root slugs, /article/, /articles/, /edition/)
#   2. Upload footer HTML + social icon SVGs to DA
#   3. Re-migrate all 813 articles to new paths (/archive/news/{year}/, /section/stamps/{sub}/{year}/, etc.)
#
# Usage (background):
#   nohup bash scripts-migration/full-reset-and-migrate.sh > reset-migrate.log 2>&1 &
#
# URL file defaults to scripts-migration/urls-articles.txt; override with first argument:
#   bash scripts-migration/full-reset-and-migrate.sh scripts-migration/urls-articles.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR/.."
URL_FILE="${1:-$SCRIPT_DIR/urls-articles.txt}"
BATCH=50

echo "========================================================"
echo " AusPost Newsroom: Full Reset + Re-migration"
echo " Started: $(date)"
echo "========================================================"
echo ""

# Validate token is readable
python3 - <<'PYEOF'
import json, sys
try:
    d = json.load(open("$REPO_DIR/.hlx/.da-token.json".replace("$REPO_DIR", __import__("os").path.dirname(__file__) + "/..")))
    print(f"Token OK (first 20 chars): {d['access_token'][:20]}...")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF

# Inline token check (safer in bash heredoc context)
python3 -c "
import json, sys, os
tf = os.path.join('$REPO_DIR', '.hlx', '.da-token.json')
d = json.load(open(tf))
print('Token OK:', d['access_token'][:20] + '...')
" || { echo "ERROR: Cannot read DA token at $REPO_DIR/.hlx/.da-token.json"; exit 1; }

echo ""
echo "--------------------------------------------------------"
echo "Step 1/3: Delete old DA content"
echo "--------------------------------------------------------"
python3 "$SCRIPT_DIR/delete_da_content.py"

echo ""
echo "--------------------------------------------------------"
echo "Step 2/3: Upload footer assets"
echo "--------------------------------------------------------"
python3 "$SCRIPT_DIR/upload_footer_assets.py"

echo ""
echo "--------------------------------------------------------"
echo "Step 3/3: Re-migrate all articles"
echo "URL file: $URL_FILE"
echo "--------------------------------------------------------"

TOTAL=$(wc -l < "$URL_FILE" | tr -d ' ')
START=0

while [ "$START" -lt "$TOTAL" ]; do
    END=$((START + BATCH))
    echo ""
    echo "  [$(date '+%H:%M:%S')] Batch $START–$END of $TOTAL ..."
    python3 "$SCRIPT_DIR/migrate.py" \
        --list "$URL_FILE" \
        --start "$START" \
        --limit "$BATCH" \
        --sleep 1.2
    START=$END
done

echo ""
echo "========================================================"
echo " Migration Complete: $(date)"
echo "========================================================"
