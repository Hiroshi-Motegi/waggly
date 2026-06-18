#!/bin/bash
# 全バッチを順番に実行
# Usage: bash scripts/golfnavi-run-all.sh

for i in $(seq 1 10); do
  echo "=========================================="
  echo "  Starting batch $i / 10"
  echo "  $(date)"
  echo "=========================================="
  node scripts/scrape-golfnavi.mjs --batch=$i
  echo ""
  echo "  Batch $i done. Sleeping 30s before next..."
  sleep 30
done

echo "✅ All batches complete!"
