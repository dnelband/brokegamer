#!/usr/bin/env bash
# Install / uninstall a LaunchAgent that runs scripts/run-local-cron.sh daily.
#
#   ./scripts/install-local-cron-launchd.sh           # install (default 07:00)
#   ./scripts/install-local-cron-launchd.sh 6 30      # 06:30 local time
#   ./scripts/install-local-cron-launchd.sh --uninstall

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.brokegamer.local-cron"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
SCRIPT="${ROOT}/scripts/run-local-cron.sh"
LOG_DIR="${HOME}/Library/Logs/gamesunder10"
PATH_VALUE="${PATH}"
DEFAULT_PORT="${PORT:-3001}"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed ${PLIST}"
  exit 0
fi

HOUR="${1:-7}"
MINUTE="${2:-0}"

if ! [[ "$HOUR" =~ ^[0-9]+$ && "$MINUTE" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [hour] [minute]   or   $0 --uninstall" >&2
  exit 1
fi

chmod +x "$SCRIPT" "${ROOT}/scripts/install-local-cron-launchd.sh"
mkdir -p "$LOG_DIR" "$(dirname "$PLIST")"

cat >"$PLIST" <<EOF_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${SCRIPT}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${PATH_VALUE}</string>
    <key>PORT</key>
    <string>${DEFAULT_PORT}</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${HOUR}</integer>
    <key>Minute</key>
    <integer>${MINUTE}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd-stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd-stderr.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
EOF_PLIST

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true

echo "Installed ${PLIST}"
echo "  Schedule: every day at $(printf '%02d:%02d' "$HOUR" "$MINUTE") (local time)"
echo "  Script:   ${SCRIPT}"
echo "  PATH:     ${PATH_VALUE}"
echo "  PORT:     ${DEFAULT_PORT}"
echo "  Logs:     ${LOG_DIR}/"
echo ""
echo "Test now:   ${SCRIPT}"
echo "Or once:    launchctl kickstart -k gui/$(id -u)/${LABEL}"
echo "Uninstall:  $0 --uninstall"
echo ""
echo "Note: if the Mac is asleep at that time, the job runs after wake."
