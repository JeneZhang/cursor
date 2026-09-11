#!/usr/bin/env python3
"""Probe how agent input and human input coexist on the cloud desktop.

The agent drives the desktop with `xdotool`, which injects through the XTEST
extension. A person drives it from a VNC viewer, which sends RFB
PointerEvent/KeyEvent messages to Xtigervnc. Those are two different code
paths, so the only faithful way to test coordination between them is to speak
both: xdotool for the agent side, and a real RFB client for the human side.

This file contains a minimal RFB client for exactly that purpose. It connects
with shared=1, so it never evicts a person who is already watching.

Usage:
    DISPLAY=:1 python3 tools/cloud-desktop-audit/input-coordination-probe.py
    DISPLAY=:1 python3 tools/cloud-desktop-audit/input-coordination-probe.py pointer gate

Probes:
    pointer   whether human input takes effect, and what happens when both
              sides write the pointer, including during an agent drag
    gate      whether Xtigervnc's AcceptPointerEvents / AcceptKeyEvents can be
              flipped at runtime to admit or exclude the human without
              affecting the agent
    focus     whether a person clicking another window diverts keystrokes the
              agent is still in the middle of typing

`focus` needs two windows on screen and will type into whatever holds focus, so
it is not part of the default set. Pass it explicitly.
"""

from __future__ import annotations

import argparse
import os
import socket
import struct
import subprocess
import sys
import threading
import time

DISPLAY = os.environ.get("DISPLAY", ":1")
XENV = {**os.environ, "DISPLAY": DISPLAY}
VNC_HOST, VNC_PORT = "127.0.0.1", 5901

DEFAULT_PROBES = ("pointer", "gate")
ALL_PROBES = ("pointer", "gate", "focus")


class RfbClient:
    """Just enough of RFB 3.8 to send input the way a VNC viewer does."""

    def __init__(self, host=VNC_HOST, port=VNC_PORT):
        self.sock = socket.create_connection((host, port), timeout=10)
        self.width = self.height = 0
        self.name = self.server_version = ""
        self._handshake()

    def _recv(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("server closed during handshake")
            buf += chunk
        return buf

    def _handshake(self):
        version = self._recv(12)
        if not version.startswith(b"RFB "):
            raise ConnectionError(f"not an RFB server: {version!r}")
        self.server_version = version.decode().strip()
        self.sock.sendall(version)

        count = self._recv(1)[0]
        if count == 0:
            reason_len = struct.unpack(">I", self._recv(4))[0]
            raise ConnectionError(self._recv(reason_len).decode())
        offered = self._recv(count)
        if 1 not in offered:  # 1 == None, no authentication
            raise ConnectionError(f"server requires auth, offers {list(offered)}")
        self.sock.sendall(bytes([1]))
        if struct.unpack(">I", self._recv(4))[0] != 0:
            raise ConnectionError("security handshake rejected")

        # shared=1: do not disconnect anyone else already viewing.
        self.sock.sendall(bytes([1]))
        self.width, self.height = struct.unpack(">HH", self._recv(4))
        self._recv(16)  # pixel format
        name_len = struct.unpack(">I", self._recv(4))[0]
        self.name = self._recv(name_len).decode(errors="replace")

    def pointer(self, x, y, button_mask=0):
        self.sock.sendall(struct.pack(">BBHH", 5, button_mask, x, y))

    def key(self, keysym, down):
        self.sock.sendall(struct.pack(">BBHI", 4, 1 if down else 0, 0, keysym))

    def close(self):
        self.sock.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


# ---------------------------------------------------------------------------
# agent-side helpers
# ---------------------------------------------------------------------------


def xdo(*args, **kwargs):
    return subprocess.run(["xdotool", *args], capture_output=True, text=True, env=XENV, **kwargs)


def pointer_position():
    values = dict(
        line.split("=", 1)
        for line in xdo("getmouselocation", "--shell").stdout.strip().splitlines()
        if "=" in line
    )
    return int(values["X"]), int(values["Y"])


def agent_move(x, y):
    xdo("mousemove", str(x), str(y))


def vncconfig(*args):
    proc = subprocess.run(["vncconfig", *args], capture_output=True, text=True, env=XENV, timeout=20)
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def window_named(pattern):
    lines = xdo("search", "--name", pattern).stdout.strip().splitlines()
    return lines[-1].strip() if lines else None


def window_title(window):
    return xdo("getwindowname", window).stdout.strip()


def window_centre(window, y_offset=None):
    geo = dict(
        line.split("=", 1)
        for line in xdo("getwindowgeometry", "--shell", window).stdout.strip().splitlines()
        if "=" in line
    )
    x = int(geo["X"]) + int(geo["WIDTH"]) // 2
    y = int(geo["Y"]) + (y_offset if y_offset is not None else int(geo["HEIGHT"]) // 2)
    return x, y


# ---------------------------------------------------------------------------
# probes
# ---------------------------------------------------------------------------


def probe_pointer():
    """Both sides write one shared pointer, with no arbitration between them."""
    with RfbClient() as human:
        print(f"  connected as a VNC client: {human.server_version}, "
              f'desktop "{human.name}", {human.width}x{human.height}')

        agent_move(300, 300)
        print(f"  agent moves to (300,300)          -> {pointer_position()}")
        human.pointer(1400, 800)
        time.sleep(0.4)
        print(f"  human moves to (1400,800)         -> {pointer_position()}")

        print("  alternating writes:")
        for i in range(3):
            agent_move(400 + i * 60, 300)
            after_agent = pointer_position()
            human.pointer(1200 - i * 60, 800)
            time.sleep(0.25)
            print(f"    round {i + 1}: after agent {after_agent}, after human {pointer_position()}")
        print("  neither side blocked, queued or errored: the last write wins")

        # A drag holds a button down across several moves, so a human move in
        # the middle of it silently relocates where the button comes back up.
        agent_move(600, 500)
        xdo("mousedown", "1")
        pressed_at = pointer_position()
        human.pointer(1700, 200, button_mask=0)
        time.sleep(0.4)
        hijacked_to = pointer_position()
        xdo("mouseup", "1")
        print(f"  agent pressed at {pressed_at}, human moved to {hijacked_to}, "
              f"agent released at {pointer_position()}")

        human.pointer(960, 600)
        time.sleep(0.4)
        print(f"  human moves to (960,600); agent's cursor_position reads {pointer_position()}")
        print("  the agent cannot tell its own motion from the human's: events carry no origin")

    agent_move(960, 1010)


def probe_gate():
    """Xtigervnc can admit or exclude RFB input at runtime, per input class."""
    gates = ("AcceptPointerEvents", "AcceptKeyEvents", "AcceptCutText", "SendCutText")
    print("  current gate settings:")
    for gate in gates:
        code, out = vncconfig("-get", gate)
        print(f"    {gate:<22} {out if code == 0 else f'unreadable: {out}'}")

    with RfbClient() as human:
        agent_move(300, 300)
        human.pointer(1400, 800)
        time.sleep(0.4)
        open_ok = pointer_position() == (1400, 800)
        print(f"  gate open  -> human input takes effect: {open_ok}")

        code, out = vncconfig("-set", "AcceptPointerEvents=0")
        if code != 0:
            print(f"  could not close the gate: {out}")
            return
        time.sleep(0.3)
        try:
            agent_move(500, 500)
            human.pointer(1700, 900)
            time.sleep(0.6)
            human_blocked = pointer_position() == (500, 500)
            agent_move(640, 420)
            agent_still_works = pointer_position() == (640, 420)
            print(f"  gate shut  -> human input blocked: {human_blocked}, "
                  f"agent input still works: {agent_still_works}")
        finally:
            vncconfig("-set", "AcceptPointerEvents=1")
            time.sleep(0.3)

        human.pointer(1000, 700)
        time.sleep(0.5)
        print(f"  gate reopened -> human input restored: {pointer_position() == (1000, 700)}")

    agent_move(960, 1010)
    print("  nothing in the image uses these gates; they are left at the default of accepting everything")


FOCUS_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz"


def probe_focus():
    """One keyboard focus per session: a human click diverts in-flight typing."""
    sink = window_named("^SINK")
    other = next((window_named(p) for p in ("^Markdown Todo", "^Mousepad", "^Thunar") if window_named(p)), None)
    if not sink or not other:
        print("  skipped: needs a window titled 'SINK|...' to type into plus one other window")
        print(f"           (found sink={sink}, other={other})")
        return

    print(f"  typing target: {window_title(sink)!r}")
    print(f"  window a person will click: {window_title(other)!r}")

    xdo("windowactivate", "--sync", sink)
    time.sleep(1.2)
    cx, cy = window_centre(sink)
    xdo("mousemove", str(cx), str(cy), "click", "1")
    time.sleep(0.5)
    xdo("key", "--clearmodifiers", "ctrl+a")
    xdo("key", "--clearmodifiers", "Delete")
    time.sleep(0.4)

    typing = threading.Thread(
        target=lambda: xdo("type", "--delay", "60", "--", FOCUS_TEXT), daemon=True)
    typing.start()

    with RfbClient() as human:
        time.sleep(len(FOCUS_TEXT) * 0.06 / 3)
        ox, oy = window_centre(other, y_offset=60)
        print(f"  a third of the way through, the human clicks the other window at ({ox},{oy})")
        human.pointer(ox, oy, 0)
        time.sleep(0.15)
        human.pointer(ox, oy, 1)
        time.sleep(0.15)
        human.pointer(ox, oy, 0)
        typing.join(timeout=25)
        time.sleep(1.0)

    title = window_title(sink)
    if title.endswith(" - Google Chrome"):
        title = title[: -len(" - Google Chrome")]
    received = title.split("SINK|", 1)[1] if "SINK|" in title else ""
    print(f"  intended window received {len(received)}/{len(FOCUS_TEXT)} characters")
    print(f"    expected {FOCUS_TEXT!r}")
    print(f"    received {received!r}")
    if len(received) < len(FOCUS_TEXT):
        print(f"  {len(FOCUS_TEXT) - len(received)} characters were delivered to a different "
              "application, with no error and no warning")
    agent_move(960, 1010)


PROBES = {"pointer": probe_pointer, "gate": probe_gate, "focus": probe_focus}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("probes", nargs="*", choices=ALL_PROBES, help=f"default: {' '.join(DEFAULT_PROBES)}")
    args = parser.parse_args()

    for name in args.probes or list(DEFAULT_PROBES):
        print(f"\n=== {name} ===")
        try:
            PROBES[name]()
        except (ConnectionError, OSError) as err:
            print(f"  FAILED: {type(err).__name__}: {err}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
