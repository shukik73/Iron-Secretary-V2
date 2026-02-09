#!/bin/bash
# ============================================================
# Iron Secretary V2 — Full Deployment Script
# Run this from the Iron-Secretary-V2 repo root on your local machine.
#
# Prerequisites:
#   - Supabase CLI installed (brew install supabase/tap/supabase)
#   - Logged in (supabase login)
#   - Telegram bot token from @BotFather
# ============================================================

set -e

PROJECT_REF="djusjenyxujukdydhajp"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo ""
echo "=========================================="
echo "  Iron Secretary V2 — Deployment"
echo "=========================================="
echo ""
echo "  Project: ${PROJECT_REF}"
echo "  URL:     ${SUPABASE_URL}"
echo ""

# ── Step 1: Link project ─────────────────────────────────────
echo "[1/8] Linking Supabase project..."
supabase link --project-ref "$PROJECT_REF"
echo "  ✅ Project linked"
echo ""

# ── Step 2: Enable extensions ─────────────────────────────────
echo "[2/8] Enabling pg_cron and pg_net extensions..."
echo "  ⚠️  Go to your Supabase Dashboard and enable these manually:"
echo "     → https://supabase.com/dashboard/project/${PROJECT_REF}/database/extensions"
echo "     → Search 'pg_cron' → Enable"
echo "     → Search 'pg_net' → Enable"
echo ""
read -p "  Press ENTER when both extensions are enabled..."
echo "  ✅ Extensions confirmed"
echo ""

# ── Step 3: Push migrations ──────────────────────────────────
echo "[3/8] Running database migrations..."
supabase db push
echo "  ✅ Migrations applied:"
echo "     - 20260209000001_create_multi_agent_task_system.sql"
echo "     - 20260209000002_create_notification_system.sql"
echo "     - 20260209000003_create_cron_schedules.sql"
echo ""

# ── Step 4: Set Telegram bot token ────────────────────────────
echo "[4/8] Setting Telegram bot token..."
read -p "  Enter your Telegram bot token from @BotFather: " BOT_TOKEN
if [ -z "$BOT_TOKEN" ]; then
  echo "  ❌ No token provided. Skipping Telegram setup."
  echo "     Run later: supabase secrets set TELEGRAM_BOT_TOKEN=<your_token>"
else
  supabase secrets set TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
  echo "  ✅ Bot token saved"
fi
echo ""

# ── Step 5: Deploy edge functions ─────────────────────────────
echo "[5/8] Deploying edge functions..."
supabase functions deploy telegram-bot --no-verify-jwt
supabase functions deploy jay-cron --no-verify-jwt
echo "  ✅ Functions deployed: telegram-bot, jay-cron"
echo ""

# ── Step 6: Configure app settings for pg_cron ────────────────
echo "[6/8] Configuring app settings for pg_cron..."
echo "  ⚠️  Go to SQL Editor in your Supabase Dashboard:"
echo "     → https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
echo ""
echo "  Paste and run this SQL:"
echo ""
echo "  ┌──────────────────────────────────────────────────────────┐"
echo "  │ ALTER DATABASE postgres                                  │"
echo "  │   SET app.settings.supabase_url = '${SUPABASE_URL}';    │"
echo "  │                                                          │"
echo "  │ -- Get your service_role key from Settings > API         │"
echo "  │ ALTER DATABASE postgres                                  │"
echo "  │   SET app.settings.service_role_key = 'YOUR_KEY_HERE';   │"
echo "  └──────────────────────────────────────────────────────────┘"
echo ""
read -p "  Press ENTER when done..."
echo "  ✅ App settings configured"
echo ""

# ── Step 7: Set Telegram webhook ──────────────────────────────
echo "[7/8] Setting Telegram webhook..."
if [ -n "$BOT_TOKEN" ]; then
  WEBHOOK_URL="${SUPABASE_URL}/functions/v1/telegram-bot"
  RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")
  echo "  Webhook URL: ${WEBHOOK_URL}"
  echo "  Response: ${RESULT}"
  echo "  ✅ Webhook set"
else
  echo "  ⏭️  Skipped (no bot token). Run manually:"
  echo "     curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=${SUPABASE_URL}/functions/v1/telegram-bot"
fi
echo ""

# ── Step 8: Register chat_id ─────────────────────────────────
echo "[8/8] Register your Telegram chat_id..."
if [ -n "$BOT_TOKEN" ]; then
  echo "  Send any message to your bot on Telegram, then press ENTER."
  read -p "  Press ENTER after sending a message..."
  UPDATES=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates")
  CHAT_ID=$(echo "$UPDATES" | grep -o '"chat":{"id":[0-9]*' | head -1 | grep -o '[0-9]*$')

  if [ -n "$CHAT_ID" ]; then
    echo "  Found chat_id: ${CHAT_ID}"
    echo ""
    echo "  Now run this in SQL Editor:"
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────┐"
    echo "  │ INSERT INTO telegram_config (user_id, chat_id)          │"
    echo "  │ VALUES (                                                 │"
    echo "  │   (SELECT id FROM auth.users LIMIT 1),                  │"
    echo "  │   ${CHAT_ID}                                            │"
    echo "  │ );                                                       │"
    echo "  └──────────────────────────────────────────────────────────┘"
  else
    echo "  ❌ Could not find chat_id. Make sure you sent a message to the bot."
    echo "     Check manually: curl https://api.telegram.org/bot${BOT_TOKEN}/getUpdates"
  fi
else
  echo "  ⏭️  Skipped (no bot token)"
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Test Jay by sending /status to your Telegram bot."
echo ""
echo "  Dashboard: ${SUPABASE_URL}"
echo "  Edge Functions:"
echo "    - ${SUPABASE_URL}/functions/v1/telegram-bot"
echo "    - ${SUPABASE_URL}/functions/v1/jay-cron"
echo ""
