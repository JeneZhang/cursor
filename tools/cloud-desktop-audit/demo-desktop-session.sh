#!/usr/bin/env bash
# Launch the Markdown Todo Electron app on the cloud desktop, ready to be driven
# by the computer-use tool.
#
# This is the reference end-to-end example for the cloud desktop: a real GTK/
# Electron application on the XFCE session that the VNC framebuffer shows, with
# seeded state so a session starts in the app rather than in a file dialog.
#
# Usage:
#   tools/cloud-desktop-audit/demo-desktop-session.sh [--reset]
#
#   --reset   discard the seeded todo file and Electron profile first
#
# Prints the window id and geometry of the app window it started.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export DISPLAY="${DISPLAY:-:1}"

DEMO_DIR="${DEMO_DIR:-$HOME/cloud-desktop-demo}"
TODO_FILE="$DEMO_DIR/todos.md"
ELECTRON_USER_DATA="$DEMO_DIR/electron-profile"
ELECTRON_BIN="$REPO_ROOT/node_modules/electron/dist/electron"
WINDOW_TITLE="Markdown Todo"

if [[ "${1:-}" == "--reset" ]]; then
  rm -rf "$DEMO_DIR"
fi

log() { printf '[demo] %s\n' "$*"; }

if ! command -v xdotool >/dev/null; then
  echo "xdotool is required (cloud desktop image provides it)" >&2
  exit 1
fi
if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
  echo "no X server on $DISPLAY - the desktop session is not running" >&2
  exit 1
fi

if [[ ! -x "$ELECTRON_BIN" ]]; then
  log "electron missing, running npm install"
  (cd "$REPO_ROOT" && npm install)
fi
if [[ ! -f "$REPO_ROOT/out/main/index.js" ]]; then
  log "build output missing, running npm run build"
  (cd "$REPO_ROOT" && npm run build)
fi

mkdir -p "$DEMO_DIR" "$ELECTRON_USER_DATA"

# Seed a todo file with content that exercises the parts of the stack this audit
# cares about: CJK text the fallback fonts have to render, accented Latin, and
# enough rows that filters and search have something to do.
if [[ ! -f "$TODO_FILE" ]]; then
  log "seeding $TODO_FILE"
  cat > "$TODO_FILE" <<'MARKDOWN'
# Todos

<!-- todo-app-format: v1 -->

## [open] Measure screenshot latency end to end (id: a10001, priority: high, tags: audit, latency)
Created: 2026-08-29T00:00:00.000Z
Updated: 2026-08-29T00:00:00.000Z

Compare the 2000 ms settle delay against the time the UI actually needs.

---

## [open] 云端桌面字体回退检查 (id: a10002, priority: high, tags: audit, fonts)
Created: 2026-08-29T00:01:00.000Z
Updated: 2026-08-29T00:01:00.000Z

确认中日韩文字在没有 Noto CJK 时的回退字体质量。

---

## [open] Revisar acentuación: Aprenderás rápido (id: a10003, tags: audit, input)
Created: 2026-08-29T00:02:00.000Z
Updated: 2026-08-29T00:02:00.000Z

Non-ASCII typing has to survive the keymap round trip.

---

## [done] Confirm xdotool is on the image (id: a10004, priority: low, tags: audit)
Created: 2026-08-28T23:00:00.000Z
Updated: 2026-08-28T23:30:00.000Z
Completed: 2026-08-28T23:30:00.000Z

---
MARKDOWN
fi

# Point the app at the seeded file so it boots straight into the list. The app
# reads this on startup via prefs:getLastPath.
printf '{\n  "lastPath": "%s"\n}\n' "$TODO_FILE" > "$ELECTRON_USER_DATA/prefs.json"

if xdotool search --name "^${WINDOW_TITLE}" >/dev/null 2>&1; then
  existing="$(xdotool search --name "^${WINDOW_TITLE}" | tail -1)"
  if [[ -n "$existing" ]]; then
    log "app already running (window $existing), activating"
    xdotool windowactivate --sync "$existing"
    xdotool getwindowgeometry --shell "$existing"
    exit 0
  fi
fi

log "starting electron on $DISPLAY"
# --no-sandbox: the container has no setuid sandbox helper.
# Software GL: the VM has no GPU, so ANGLE/SwiftShader does the rendering.
LIBGL_ALWAYS_SOFTWARE=1 \
GALLIUM_DRIVER=llvmpipe \
setsid "$ELECTRON_BIN" "$REPO_ROOT" \
  --no-sandbox \
  --disable-dev-shm-usage \
  --use-gl=angle \
  --use-angle=swiftshader-webgl \
  --user-data-dir="$ELECTRON_USER_DATA" \
  > "$DEMO_DIR/electron.log" 2>&1 < /dev/null &

for _ in $(seq 1 60); do
  window="$(xdotool search --name "^${WINDOW_TITLE}" 2>/dev/null | tail -1 || true)"
  if [[ -n "$window" ]]; then
    xdotool windowactivate --sync "$window"
    sleep 1
    log "window $window is up"
    xdotool getwindowgeometry --shell "$window"
    log "todo file: $TODO_FILE"
    log "electron log: $DEMO_DIR/electron.log"
    exit 0
  fi
  sleep 1
done

echo "electron window never appeared; see $DEMO_DIR/electron.log" >&2
tail -30 "$DEMO_DIR/electron.log" >&2 || true
exit 1
