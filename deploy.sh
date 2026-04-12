#!/bin/bash
# MC Deploy Script — protects .env from being wiped
set -e
cd /docker/invictus-mc

echo "📦 MC Deploy — Sun Apr 12 11:18:40 IST 2026"

# 1. Backup .env
if [ -f .env ]; then
  cp .env .env.deploy-backup
  echo "✅ .env backed up"
fi

# 2. Build
echo "🔨 Building..."
docker compose build --no-cache 2>&1 | tail -5

# 3. Restore .env if it got wiped
if [ -f .env.deploy-backup ] && [ ! -f .env ]; then
  cp .env.deploy-backup .env
  echo "⚠️ .env was wiped — restored from backup"
elif [ -f .env.deploy-backup ]; then
  # Merge: keep any new vars from current .env, add back missing ones from backup
  sort -u -t= -k1,1 .env .env.deploy-backup > .env.merged
  mv .env.merged .env
  echo "✅ .env merged (kept existing + restored missing)"
fi

# 4. Restart
echo "🔄 Restarting..."
docker compose up -d 2>&1

# 5. Wait and verify
sleep 8
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/api/agents)
if [ "$STATUS" = "200" ]; then
  echo "✅ MC is UP — API returned 200"
else
  echo "⚠️ MC returned HTTP $STATUS — may need a moment"
fi

# 6. Git push
git add -A
git commit -m "deploy: $(date +%Y-%m-%d_%H:%M)" 2>/dev/null || echo "No changes to commit"
git push origin main 2>&1 | tail -2

echo "🚀 Deploy complete"
