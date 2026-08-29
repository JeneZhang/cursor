#!/usr/bin/env python3
"""Audit the Cursor cloud desktop (VNC/X11) and computer-use input stack.

Every number this prints is measured on the machine it runs on. Nothing is
assumed about the host, so the same script can be used to compare a baseline
image against a modified one.

Usage:
    python3 tools/cloud-desktop-audit/audit.py                    # all sections
    python3 tools/cloud-desktop-audit/audit.py inventory screenshot
    python3 tools/cloud-desktop-audit/audit.py --json out.json    # machine readable

Sections:
    inventory   static facts about the X server, VNC path, WM and tool versions
    fonts       glyph coverage for the scripts a multilingual agent has to type
    screenshot  latency and payload size of the computer-use screenshot pipeline
    input       per-action latency of the xdotool-based input path
    typing      throughput and, more importantly, fidelity of `type` actions
    capture     cost of the screen-recording capture stage
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import time
import unicodedata

DISPLAY = os.environ.get("DISPLAY", ":1")
XENV = {**os.environ, "DISPLAY": DISPLAY}

# What the model sees. Mirrors API_WIDTH in the exec-daemon computer-use module.
API_WIDTH = 1280

SECTIONS = ("inventory", "fonts", "screenshot", "input", "typing", "capture")


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------


def run(argv, timeout=60, env=XENV, stdin=None):
    """Run a command, returning (exit_code, stdout, stderr) as text."""
    try:
        proc = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
            input=stdin,
            errors="replace",
        )
        return proc.returncode, proc.stdout, proc.stderr
    except FileNotFoundError:
        return 127, "", f"{argv[0]}: not found"
    except subprocess.TimeoutExpired:
        return 124, "", f"{argv[0]}: timed out after {timeout}s"


def run_bytes(argv, timeout=60):
    proc = subprocess.run(argv, capture_output=True, timeout=timeout, env=XENV)
    return proc.returncode, proc.stdout, proc.stderr


def first_line(text):
    return text.strip().splitlines()[0].strip() if text.strip() else ""


def timed(fn, repeats):
    """Return (samples_ms, last_result) for `repeats` calls of `fn`."""
    samples, result = [], None
    for _ in range(repeats):
        start = time.perf_counter()
        result = fn()
        samples.append((time.perf_counter() - start) * 1000.0)
    return samples, result


def stats(samples):
    ordered = sorted(samples)
    return {
        "n": len(ordered),
        "min_ms": round(ordered[0], 1),
        "p50_ms": round(statistics.median(ordered), 1),
        "max_ms": round(ordered[-1], 1),
        "mean_ms": round(statistics.fmean(ordered), 1),
    }


def human_bytes(n):
    return f"{n / 1024:.0f} KiB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.2f} MiB"


# --------------------------------------------------------------------------
# inventory
# --------------------------------------------------------------------------


def detect_display():
    """Resolution and refresh rate from xrandr, the same source the daemon uses."""
    _, out, _ = run(["xrandr", "--display", DISPLAY, "--query"])
    match = re.search(r"(\d+)x(\d+)\+\d+\+\d+", out)
    width, height = (int(match.group(1)), int(match.group(2))) if match else (0, 0)
    refresh = re.search(r"(\d+\.\d+)\*", out)
    return {
        "width": width,
        "height": height,
        "refresh_hz": float(refresh.group(1)) if refresh else None,
    }


def section_inventory():
    display = detect_display()
    _, dpy, _ = run(["xdpyinfo", "-display", DISPLAY])
    extensions = re.findall(r"^\s{4}(\S+)$", dpy, re.M)
    dpi = re.search(r"resolution:\s+(\d+)x(\d+) dots per inch", dpy)

    _, ps, _ = run(["ps", "-eo", "args="], env=os.environ)
    procs = {
        name: first_line("\n".join(l for l in ps.splitlines() if pattern in l))
        for name, pattern in (
            ("x_server", "Xtigervnc"),
            ("vnc_wrapper", "tigervncserver"),
            ("websockify", "websockify"),
            ("window_manager", "xfwm4"),
            ("dock", "plank"),
            ("panel", "xfce4-panel"),
        )
    }

    versions = {}
    for name, argv, pick in (
        ("xdotool", ["xdotool", "--version"], 0),
        ("ffmpeg", ["ffmpeg", "-version"], 0),
        ("xfwm4", ["xfwm4", "--version"], 0),
        ("xfce4-session", ["xfce4-session", "--version"], 0),
        ("google-chrome", ["google-chrome", "--version"], 0),
        ("Xtigervnc", ["Xtigervnc", "-version"], 0),
    ):
        code, out, err = run(argv, timeout=30)
        text = out if out.strip() else err
        versions[name] = first_line(text) if code in (0, 1) and text.strip() else "unavailable"

    # Spare keycodes bound the borrowed-key Unicode typing path: each distinct
    # unmapped character in a run needs one.
    _, keymap, _ = run(["xmodmap", "-pke"])
    spare = [
        int(m.group(1))
        for m in (re.match(r"keycode\s+(\d+)\s*=\s*$", line.strip()) for line in keymap.splitlines())
        if m
    ]

    api_height = round(display["height"] * API_WIDTH / display["width"]) if display["width"] else 0

    return {
        "display": DISPLAY,
        "resolution": display,
        "dpi": int(dpi.group(1)) if dpi else None,
        "api_resolution": {"width": API_WIDTH, "height": api_height},
        "downscale_factor": round(display["width"] / API_WIDTH, 4) if display["width"] else None,
        "x_extensions": extensions,
        "has_damage_ext": "DAMAGE" in extensions,
        "has_xtest_ext": "XTEST" in extensions,
        "processes": procs,
        "versions": versions,
        "spare_keycodes": len(spare),
        "cpu_count": os.cpu_count(),
    }


def print_inventory(data):
    res = data["resolution"]
    api = data["api_resolution"]
    print(f"  display              {data['display']}")
    print(f"  framebuffer          {res['width']}x{res['height']} @ {res['refresh_hz']}Hz, {data['dpi']} DPI")
    print(f"  model sees           {api['width']}x{api['height']} (downscale {data['downscale_factor']}x)")
    print(f"  cpus                 {data['cpu_count']}")
    print(f"  spare keycodes       {data['spare_keycodes']} (caps distinct non-ASCII chars per type run)")
    print("  processes")
    for name, cmd in data["processes"].items():
        print(f"    {name:<16} {cmd or '(not running)'}")
    print("  versions")
    for name, ver in data["versions"].items():
        print(f"    {name:<16} {ver}")


# --------------------------------------------------------------------------
# fonts
# --------------------------------------------------------------------------

# One representative codepoint per script an agent may be asked to read or type.
FONT_PROBES = [
    ("Latin accented", "á", 0x00E1),
    ("Cyrillic", "п", 0x043F),
    ("Greek", "π", 0x03C0),
    ("Chinese (Simplified)", "你", 0x4F60),
    ("Chinese (Traditional)", "髮", 0x9AEE),
    ("Japanese kana", "こ", 0x3053),
    ("Korean hangul", "한", 0xD55C),
    ("Arabic", "م", 0x0645),
    ("Hebrew", "ש", 0x05E9),
    ("Devanagari", "क", 0x0915),
    ("Thai", "ก", 0x0E01),
    ("Emoji", "😀", 0x1F600),
]

# Fonts the desktop actually asks for, from the xsettings/gtk/terminalrc config.
UI_FONTS = ("Inter", "JetBrains Mono", "Cascadia Code")


def fonts_covering(codepoint):
    """Families that really contain `codepoint`, in fontconfig preference order.

    fc-match always answers with *some* font, so on its own it cannot detect a
    missing glyph: asked for an emoji it will happily name a font with no emoji
    in it. fc-list with a charset filter lists only fonts that do contain the
    character, so intersecting the two gives both "is it covered at all" and
    "which font would actually be picked".
    """
    _, listed, _ = run(["fc-list", f":charset={codepoint:x}", "file"])
    covering = {line.strip().rstrip(":") for line in listed.strip().splitlines() if line.strip()}
    if not covering:
        return []

    _, ordered, _ = run(["fc-match", "-s", "--format=%{file}\\t%{family[0]}\\n", f":charset={codepoint:x}"])
    families = []
    for line in ordered.strip().splitlines():
        path, _, family = line.partition("\t")
        if path.strip() in covering and family.strip() and family.strip() not in families:
            families.append(family.strip())
    if families:
        return families
    # fc-match printed nothing usable; fall back to unordered coverage.
    _, listed_families, _ = run(["fc-list", f":charset={codepoint:x}", "family"])
    return [line.split(",")[0].strip() for line in listed_families.strip().splitlines() if line.strip()]


def section_fonts():
    probes = []
    for label, char, codepoint in FONT_PROBES:
        covering = fonts_covering(codepoint)
        ui_font_covers = [f for f in UI_FONTS if f in covering]
        probes.append(
            {
                "script": label,
                "sample": char,
                "codepoint": f"U+{codepoint:04X}",
                "name": unicodedata.name(char, "?"),
                "font_count": len(covering),
                "fonts": covering[:4],
                "covered": bool(covering),
                "covered_by_ui_font": ui_font_covers,
            }
        )

    _, families, _ = run(["fc-list", ":", "family"])
    unique = {line.split(",")[0].strip() for line in families.strip().splitlines()}
    _, files, _ = run(["fc-list"])

    return {
        "ui_fonts_requested": list(UI_FONTS),
        "font_files": len(files.strip().splitlines()),
        "font_families": len(unique),
        "noto_cjk_installed": any("Noto Sans CJK" in f or "Noto Serif CJK" in f for f in unique),
        "probes": probes,
    }


def print_fonts(data):
    print(f"  font files {data['font_files']}, families {data['font_families']}")
    print(f"  Noto CJK installed   {data['noto_cjk_installed']}")
    print(f"  UI fonts requested   {', '.join(data['ui_fonts_requested'])}")
    print(f"    {'script':<22} {'#fonts':>6}  {'in a UI font':<12} resolves to")
    for probe in data["probes"]:
        served = probe["fonts"][0] if probe["fonts"] else "NOTHING (renders as tofu)"
        in_ui = "yes" if probe["covered_by_ui_font"] else "no (fallback)"
        print(f"    {probe['script']:<22} {probe['font_count']:>6}  {in_ui:<12} {served}")


# --------------------------------------------------------------------------
# screenshot
# --------------------------------------------------------------------------


def screenshot_variants(width, height, api_width, api_height):
    """The pipeline in use today, plus cheaper encodings, for comparison."""
    grab = ["-f", "x11grab", "-video_size", f"{width}x{height}", "-i", DISPLAY, "-frames:v", "1"]
    scale = ["-vf", f"scale={api_width}:{api_height}"]
    return [
        (
            "current: webp lossless, preset=text",
            ["ffmpeg", *grab, *scale, "-c:v", "libwebp", "-preset", "text", "-lossless", "1", "-f", "webp", "pipe:1"],
        ),
        (
            "same, but scale flags=lanczos",
            ["ffmpeg", *grab, "-vf", f"scale={api_width}:{api_height}:flags=lanczos",
             "-c:v", "libwebp", "-preset", "text", "-lossless", "1", "-f", "webp", "pipe:1"],
        ),
        (
            "same, but scale flags=area",
            ["ffmpeg", *grab, "-vf", f"scale={api_width}:{api_height}:flags=area",
             "-c:v", "libwebp", "-preset", "text", "-lossless", "1", "-f", "webp", "pipe:1"],
        ),
        (
            "webp lossy q=92",
            ["ffmpeg", *grab, *scale, "-c:v", "libwebp", "-preset", "text", "-lossless", "0", "-quality", "92", "-f", "webp", "pipe:1"],
        ),
        (
            "webp lossless, no downscale",
            ["ffmpeg", *grab, "-c:v", "libwebp", "-preset", "text", "-lossless", "1", "-f", "webp", "pipe:1"],
        ),
        (
            "png (zlib) for reference",
            ["ffmpeg", *grab, *scale, "-c:v", "png", "-f", "image2pipe", "pipe:1"],
        ),
    ]


def section_screenshot(repeats=7):
    display = detect_display()
    width, height = display["width"], display["height"]
    api_width = API_WIDTH
    api_height = round(height * API_WIDTH / width)

    results = []
    for label, argv in screenshot_variants(width, height, api_width, api_height):
        argv = [argv[0], "-loglevel", "error", "-y", *argv[1:]]

        def capture(argv=argv):
            code, stdout, stderr = run_bytes(argv)
            if code != 0:
                raise RuntimeError(stderr.decode("utf-8", "replace")[:200])
            return stdout

        try:
            samples, payload = timed(capture, repeats)
        except RuntimeError as err:
            results.append({"variant": label, "error": str(err)})
            continue
        results.append(
            {
                "variant": label,
                "bytes": len(payload),
                # The model is billed for base64, not the raw bytes.
                "base64_bytes": (len(payload) + 2) // 3 * 4,
                **stats(samples),
            }
        )

    # ffmpeg process startup, measured separately, is a fixed floor on every
    # screenshot regardless of encoder.
    startup, _ = timed(lambda: run(["ffmpeg", "-loglevel", "quiet", "-version"]), repeats)

    return {
        "settle_delay_ms": 2000,  # COMPUTER_USE_SCREENSHOT_SETTLE_DELAY_MS
        "ffmpeg_startup": stats(startup),
        "variants": results,
    }


def print_screenshot(data):
    print(f"  ffmpeg process startup floor  p50 {data['ffmpeg_startup']['p50_ms']} ms")
    print(f"  settle delay before capture   {data['settle_delay_ms']} ms (fixed, not measured)")
    print(f"    {'variant':<38} {'p50':>8} {'min':>8} {'max':>8} {'payload':>11} {'as base64':>11}")
    for row in data["variants"]:
        if "error" in row:
            print(f"    {row['variant']:<38} error: {row['error']}")
            continue
        print(
            f"    {row['variant']:<38} {row['p50_ms']:>7.0f}m {row['min_ms']:>7.0f}m {row['max_ms']:>7.0f}m"
            f" {human_bytes(row['bytes']):>11} {human_bytes(row['base64_bytes']):>11}"
        )


# --------------------------------------------------------------------------
# input
# --------------------------------------------------------------------------


def section_input(repeats=10, slow_repeats=3):
    """Latency of the xdotool path, split into spawn cost and work cost.

    The `--sync` probes are run twice on purpose: once where the pointer has to
    travel, and once where it is already on the target. xdotool implements
    `mousemove --sync` as "wait until the pointer leaves where it was", so the
    second case has nothing to wait for and blocks until xdotool gives up.
    """
    display = detect_display()
    cx, cy = display["width"] // 2, display["height"] // 2
    step = [0]

    def xdotool(*args):
        code, _, err = run(["xdotool", *args], timeout=120)
        if code != 0:
            raise RuntimeError(err[:200])

    def moving(*tail):
        """Issue the command against a coordinate the pointer is not on yet.

        A fresh target every call, otherwise every repeat after the first one
        would land on the stationary path and measure that instead.
        """

        def once():
            step[0] += 1
            x, y = cx + (step[0] * 17) % 300, cy + (step[0] * 11) % 200
            xdotool("mousemove", "--sync", str(x), str(y), *tail)

        return once

    def stationary(*tail):
        """Issue the command against the coordinate the pointer already holds.

        Parking the pointer has to happen immediately before timing starts, not
        when the probe list is built, or an earlier probe will have moved it
        away again and the first sample will measure the travelling path.
        """

        def build():
            xdotool("mousemove", "--sync", str(cx), str(cy))
            return lambda: xdotool("mousemove", "--sync", str(cx), str(cy), *tail)

        return build

    def drag_chain():
        return lambda: xdotool(
            *sum((["mousemove", "--sync", str(cx + i * 8), str(cy + i * 4)] for i in range(1, 11)), [])
        )

    probes = [
        # A no-op subcommand: everything here is process spawn + X connect.
        ("spawn floor (xdotool getactivewindow)", lambda: (lambda: run(["xdotool", "getactivewindow"])), repeats),
        ("getmouselocation --shell", lambda: (lambda: xdotool("getmouselocation", "--shell")), repeats),
        ("mousemove --sync, pointer must travel", lambda: moving(), repeats),
        ("mousemove --sync, already on target", stationary(), slow_repeats),
        ("mousemove without --sync", lambda: (lambda: xdotool("mousemove", str(cx), str(cy))), repeats),
        # How the executor issues a click: one chained xdotool invocation.
        ("click chain, pointer must travel", lambda: moving("click", "1"), repeats),
        ("click chain, already on target", stationary("click", "1"), slow_repeats),
        # 10 waypoints in one call, as a drag action is issued.
        ("10-waypoint drag chain (1 spawn)", drag_chain, repeats),
        ("key press (xdotool key -- a)", lambda: (lambda: xdotool("key", "--", "a")), repeats),
        ("xmodmap -pke (keymap read)", lambda: (lambda: run(["xmodmap", "-pke"])), repeats),
    ]

    rows = []
    for label, build, count in probes:
        try:
            samples, _ = timed(build(), count)
            rows.append({"probe": label, **stats(samples)})
        except RuntimeError as err:
            rows.append({"probe": label, "error": str(err)})
    return {"probes": rows}


def print_input(data):
    print(f"    {'probe':<40} {'p50':>10} {'min':>10} {'max':>10}")
    for row in data["probes"]:
        if "error" in row:
            print(f"    {row['probe']:<40} error: {row['error']}")
            continue
        print(f"    {row['probe']:<40} {row['p50_ms']:>9.1f}m {row['min_ms']:>9.1f}m {row['max_ms']:>9.1f}m")


# --------------------------------------------------------------------------
# typing
# --------------------------------------------------------------------------

TYPING_CASES = [
    ("ascii", "The quick brown fox jumps over the lazy dog 0123456789"),
    ("latin accents", "Aprenderás rápido: café, señor, agüero, München"),
    ("chinese", "云端桌面升级计划：先测量，再优化，最后验证效果。"),
    ("mixed cjk + ascii", "Todo 待办事项 #42 - 截图延迟 latency 2000ms"),
]

TYPING_DELAY_MS = 12  # DEFAULT_TYPING_DELAY_MS
TYPING_BATCH = 50  # DEFAULT_TYPING_BATCH_SIZE
KEYMAP_SETTLE_MS = 300


def is_ascii(text):
    return all(ord(ch) <= 0x7F for ch in text)


def spare_keycodes():
    _, keymap, _ = run(["xmodmap", "-pke"])
    return [
        int(m.group(1))
        for m in (re.match(r"keycode\s+(\d+)\s*=\s*$", line.strip()) for line in keymap.splitlines())
        if m
    ]


def type_naive(text):
    """The default path: plain `xdotool type`, batched, no keymap pinning."""
    units = list(text)
    for i in range(0, len(units), TYPING_BATCH):
        batch = "".join(units[i : i + TYPING_BATCH])
        run(
            ["xdotool", "type", "--delay", str(TYPING_DELAY_MS), "--", batch],
            env={**XENV, "LC_ALL": "C.UTF-8"},
        )


def type_borrowed(text):
    """The opt-in path: pin every unmapped char to a spare keycode first."""
    remaining = text
    runs = 0
    while remaining:
        spare = spare_keycodes()
        if not spare:
            raise RuntimeError("no spare keycodes")
        needed, length = [], 0
        for ch in remaining:
            if not is_ascii(ch) and ch not in needed:
                if len(needed) == len(spare):
                    break
                needed.append(ch)
            length += 1
        chunk, remaining = remaining[:length], remaining[length:]
        bindings = [(spare[i], f"U{ord(ch):04X}") for i, ch in enumerate(needed)]
        runs += 1
        try:
            if bindings:
                run(
                    ["xmodmap", "-"],
                    stdin="".join(f"keycode {kc} = {ks} {ks}\n" for kc, ks in bindings),
                )
                time.sleep(KEYMAP_SETTLE_MS / 1000)
            run(
                ["xdotool", "type", "--clearmodifiers", "--delay", str(TYPING_DELAY_MS), "--", chunk],
                env={**XENV, "LC_ALL": "C.UTF-8"},
            )
            if bindings:
                time.sleep(KEYMAP_SETTLE_MS / 1000)
        finally:
            if bindings:
                run(["xmodmap", "-"], stdin="".join(f"keycode {kc} =\n" for kc, _ in bindings))
    return runs


# The text area covers the whole viewport so that clicking the middle of the
# window is guaranteed to land in it and not steal focus back to the page body.
SINK_HTML = """<!doctype html>
<html><head><meta charset="utf-8"><title>SINK|</title></head>
<body style="margin:0;background:#111;color:#eee">
<textarea id="t" autofocus spellcheck="false"
  style="position:fixed;inset:0;width:100%;height:100%;border:0;box-sizing:border-box;
         background:#111;color:#eee;font:22px system-ui;padding:24px"></textarea>
<script>
  const box = document.getElementById('t');
  // Mirroring the value into the title makes it readable with
  // `xdotool getwindowname`, so the read-back path needs no DevTools client.
  box.addEventListener('input', () => { document.title = 'SINK|' + box.value; });
  box.focus();
</script>
</body></html>
"""


class ChromeSink:
    """A GUI text field that reports back exactly which characters arrived.

    `xdotool type` exits 0 even when an application drops a keystroke, so
    fidelity can only be established by reading the text back out of the
    application that received it. A browser text area is the closest stand-in
    for what a GUI agent actually types into, and mirroring its value into
    `document.title` makes the value readable with `xdotool getwindowname`.
    """

    def __init__(self):
        self.path = "/tmp/cloud-desktop-audit-sink.html"
        self.proc = None
        self.window = None

    def __enter__(self):
        if not shutil.which("google-chrome"):
            raise RuntimeError("google-chrome not installed")
        with open(self.path, "w", encoding="utf-8") as handle:
            handle.write(SINK_HTML)
        # The packaged `google-chrome` wrapper already supplies the flags this
        # image needs (--no-sandbox, profile dir, software GL). Adding a second
        # --user-data-dir here would be ignored and can land on a first-run tab.
        self.proc = subprocess.Popen(
            ["google-chrome", "--new-window", f"file://{self.path}"],
            env=XENV,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        deadline = time.time() + 45
        while time.time() < deadline:
            _, out, _ = run(["xdotool", "search", "--name", "^SINK\\|"])
            ids = [line for line in out.strip().splitlines() if line.strip()]
            if ids:
                self.window = ids[-1]
                break
            time.sleep(0.4)
        if not self.window:
            raise RuntimeError("chrome typing sink window never appeared")
        run(["xdotool", "windowactivate", "--sync", self.window])
        time.sleep(2.0)
        self.focus_field()
        return self

    def focus_field(self):
        """Click into the text area so keystrokes land in it, not the omnibox."""
        _, geom, _ = run(["xdotool", "getwindowgeometry", "--shell", self.window])
        values = dict(line.split("=", 1) for line in geom.strip().splitlines() if "=" in line)
        x, y = int(values["X"]), int(values["Y"])
        width, height = int(values["WIDTH"]), int(values["HEIGHT"])
        run(["xdotool", "mousemove", "--sync", str(x + width // 2), str(y + height // 2), "click", "1"])
        time.sleep(0.5)

    def reset(self):
        run(["xdotool", "windowactivate", "--sync", self.window])
        # ctrl+a then Delete clears the field and fires one input event, so the
        # title is left at the empty-string marker.
        run(["xdotool", "key", "--clearmodifiers", "ctrl+a"])
        run(["xdotool", "key", "--clearmodifiers", "Delete"])
        time.sleep(0.3)

    def read(self):
        time.sleep(0.5)
        _, title, _ = run(["xdotool", "getwindowname", self.window])
        title = title.rstrip("\n")
        # Chrome appends " - Google Chrome" to the tab title.
        for suffix in (" - Google Chrome",):
            if title.endswith(suffix):
                title = title[: -len(suffix)]
        marker = "SINK|"
        return title[title.index(marker) + len(marker) :] if marker in title else title

    def __exit__(self, *exc):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.proc.kill()


class TerminalSink:
    """Fallback sink: a terminal running `cat`, recording what it received."""

    def __init__(self):
        self.path = "/tmp/cloud-desktop-audit-typed.txt"
        self.proc = None
        self.window = None
        # `cat` keeps its own write offset, so truncating the file between cases
        # would leave a sparse hole of NULs rather than a clean slate. Track how
        # much has already been consumed instead.
        self.consumed = 0

    def __enter__(self):
        if not shutil.which("xfce4-terminal"):
            raise RuntimeError("xfce4-terminal not installed; cannot measure typing fidelity")
        open(self.path, "w").close()
        title = "audit-typing-sink"
        self.proc = subprocess.Popen(
            [
                "xfce4-terminal",
                "--disable-server",
                "--title",
                title,
                "--geometry=120x24",
                "-x",
                "sh",
                "-c",
                f"cat > {self.path}",
            ],
            env=XENV,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        deadline = time.time() + 25
        while time.time() < deadline:
            code, out, _ = run(["xdotool", "search", "--name", title])
            ids = [line for line in out.strip().splitlines() if line.strip()]
            if code == 0 and ids:
                self.window = ids[-1]
                break
            time.sleep(0.3)
        if not self.window:
            raise RuntimeError("typing sink window never appeared")
        run(["xdotool", "windowactivate", "--sync", self.window])
        run(["xdotool", "windowfocus", "--sync", self.window])
        time.sleep(1.0)
        return self

    def reset(self):
        run(["xdotool", "windowactivate", "--sync", self.window])
        time.sleep(0.2)

    def read(self):
        # `cat` only flushes on newline, so end the line before reading back.
        run(["xdotool", "key", "--window", self.window, "Return"])
        time.sleep(0.6)
        with open(self.path, encoding="utf-8", errors="replace") as handle:
            everything = handle.read()
        fresh = everything[self.consumed :]
        self.consumed = len(everything)
        return fresh.replace("\n", "")

    def __exit__(self, *exc):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()


def section_typing(trials=6):
    """Throughput and fidelity of `type`, over repeated trials.

    Dropped characters on the default path are a race against the application's
    cached copy of the keymap, so a single trial proves nothing. Each case is
    typed several times and the failure rate is what gets reported.
    """
    rows = []
    problems = []
    sink = None
    for build in (ChromeSink, TerminalSink):
        candidate = build()
        try:
            sink = candidate.__enter__()
            break
        except RuntimeError as err:
            candidate.__exit__(None, None, None)
            problems.append(f"{build.__name__}: {err}")
    if sink is None:
        return {"error": "; ".join(problems), "cases": []}

    try:
        for label, text in TYPING_CASES:
            for strategy, fn in (("naive (default)", type_naive), ("borrowed keys (opt-in)", type_borrowed)):
                durations, exact, failures, error = [], 0, [], None
                for _ in range(trials):
                    sink.reset()
                    start = time.perf_counter()
                    try:
                        fn(text)
                    except RuntimeError as err:
                        error = str(err)
                    durations.append((time.perf_counter() - start) * 1000)
                    received = sink.read()
                    if received == text:
                        exact += 1
                    else:
                        failures.append(received)
                median_ms = statistics.median(durations)
                rows.append(
                    {
                        "case": label,
                        "strategy": strategy,
                        "chars": len(text),
                        "distinct_non_ascii": len({c for c in text if not is_ascii(c)}),
                        "trials": trials,
                        "exact": exact,
                        "duration_ms": round(median_ms, 1),
                        "chars_per_sec": round(len(text) / (median_ms / 1000), 1) if median_ms else None,
                        "expected": text,
                        "failures": failures[:3],
                        "error": error,
                    }
                )
    finally:
        sink.__exit__(None, None, None)

    return {
        "sink": type(sink).__name__,
        "cases": rows,
        "spare_keycodes": len(spare_keycodes()),
        "trials": trials,
        "sink_fallbacks": problems,
    }


def print_typing(data):
    if data.get("error"):
        print(f"  skipped: {data['error']}")
        return
    print(f"  sink {data['sink']}, spare keycodes {data['spare_keycodes']}, {data['trials']} trials per row")
    for note in data.get("sink_fallbacks", []):
        print(f"  fell back from {note}")
    print(f"    {'case':<20} {'strategy':<24} {'chars':>6} {'distinct':>9} {'ms':>7} {'ch/s':>7}  exact")
    for row in data["cases"]:
        print(
            f"    {row['case']:<20} {row['strategy']:<24} {row['chars']:>6} {row['distinct_non_ascii']:>9}"
            f" {row['duration_ms']:>7.0f} {str(row['chars_per_sec']):>7}  {row['exact']}/{row['trials']}"
        )
        for received in row["failures"]:
            missing = "".join(ch for ch in row["expected"] if ch not in received)
            print(f"      got {received!r}  (missing {missing!r})")


# --------------------------------------------------------------------------
# capture
# --------------------------------------------------------------------------


def capture_variants(width, height, refresh):
    """The record-screen capture stage as it runs today, plus cheaper settings.

    All variants keep the all-intra GOP, because the polished renderer seeks to
    arbitrary frames and inter-frame prediction would make that expensive.
    """
    grab = [
        "-video_size", f"{width}x{height}",
        "-draw_mouse", "0",
        "-f", "x11grab", "-i", DISPLAY,
    ]
    intra = ["-x264-params", "keyint=1:min-keyint=1:scenecut=0:bframes=0"]
    encode = ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-profile:v", "high"]
    tail = ["-movflags", "+faststart", "-tune", "fastdecode"]

    def build(fps, crf, capture_fps=None):
        capture_fps = capture_fps or refresh
        return [
            "ffmpeg", "-loglevel", "error",
            "-framerate", str(capture_fps), *grab,
            "-vf", f"scale=1920:-2:flags=lanczos,fps={fps}",
            *encode, "-crf", str(crf), *intra, *tail,
        ]

    return [
        ("current: 60 fps grab, 60 fps out, crf 17", build(60, 17), 60),
        ("30 fps grab, 30 fps out, crf 17", build(30, 17, capture_fps=30), 30),
        ("30 fps grab, 30 fps out, crf 20", build(30, 20, capture_fps=30), 30),
    ]


def section_capture(seconds=6):
    """Cost of the recording capture stage, as the record-screen tool runs it."""
    display = detect_display()
    width, height = display["width"], display["height"]
    refresh = int(display["refresh_hz"] or 60)

    # Keep the screen changing so the encoder is not measured against a static
    # framebuffer, which would understate its cost.
    stirrer = subprocess.Popen(
        [
            sys.executable, "-c",
            "import subprocess,os,time,sys\n"
            "env=dict(os.environ, DISPLAY=sys.argv[1])\n"
            "i=0\n"
            "while True:\n"
            "    subprocess.run(['xdotool','mousemove',str(300+(i*37)%1200),str(300+(i*23)%600)],env=env)\n"
            "    i+=1; time.sleep(0.03)\n",
            DISPLAY,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    rows = []
    try:
        for index, (label, argv, target_fps) in enumerate(capture_variants(width, height, refresh)):
            out_path = f"/tmp/cloud-desktop-audit-capture-{index}.mp4"
            start = time.perf_counter()
            usage_before = os.times()
            proc = subprocess.run(
                [*argv, "-t", str(seconds), "-y", out_path],
                capture_output=True, text=True, env=XENV, timeout=seconds + 120,
            )
            wall_ms = (time.perf_counter() - start) * 1000
            usage_after = os.times()
            cpu_s = (usage_after.children_user - usage_before.children_user) + (
                usage_after.children_system - usage_before.children_system
            )
            size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
            _, probe, _ = run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0",
                 "-show_entries", "stream=nb_frames,width,height", "-of", "json", out_path]
            )
            try:
                stream = json.loads(probe)["streams"][0]
            except Exception:
                stream = {}
            frames = int(stream.get("nb_frames") or 0)
            rows.append(
                {
                    "variant": label,
                    "target_fps": target_fps,
                    "wall_ms": round(wall_ms, 1),
                    "cpu_seconds": round(cpu_s, 2),
                    "cpu_cores_busy": round(cpu_s / (wall_ms / 1000), 2) if wall_ms else None,
                    "output_bytes": size,
                    "bytes_per_minute": int(size * 60 / seconds) if size else 0,
                    "frames_written": frames,
                    "realized_fps": round(frames / seconds, 1) if frames else None,
                    "encoded_size": f"{stream.get('width')}x{stream.get('height')}",
                    "stderr": proc.stderr.strip()[:200],
                }
            )
    finally:
        stirrer.terminate()
        try:
            stirrer.wait(timeout=5)
        except subprocess.TimeoutExpired:
            stirrer.kill()

    return {"requested_seconds": seconds, "cpu_count": os.cpu_count(), "variants": rows}


def print_capture(data):
    print(f"  {data['requested_seconds']}s captures on {data['cpu_count']} vCPUs, mouse moving throughout")
    print(f"    {'variant':<42} {'cores':>6} {'fps':>6} {'size':>10} {'per minute':>12}")
    for row in data["variants"]:
        print(
            f"    {row['variant']:<42} {row['cpu_cores_busy']:>6.2f} {str(row['realized_fps']):>6}"
            f" {human_bytes(row['output_bytes']):>10} {human_bytes(row['bytes_per_minute']):>12}"
        )
        if row["stderr"]:
            print(f"      ffmpeg: {row['stderr']}")


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

RUNNERS = {
    "inventory": (section_inventory, print_inventory),
    "fonts": (section_fonts, print_fonts),
    "screenshot": (section_screenshot, print_screenshot),
    "input": (section_input, print_input),
    "typing": (section_typing, print_typing),
    "capture": (section_capture, print_capture),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sections", nargs="*", choices=SECTIONS, default=list(SECTIONS))
    parser.add_argument("--json", metavar="PATH", help="also write raw results as JSON")
    args = parser.parse_args()

    if not shutil.which("xdpyinfo"):
        sys.exit("no X11 tooling found (xdpyinfo missing) - is this a cloud desktop image?")

    results = {"display": DISPLAY, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    for name in args.sections:
        collect, render = RUNNERS[name]
        print(f"\n=== {name} ===")
        try:
            data = collect()
        except Exception as err:  # a broken probe must not hide the other sections
            print(f"  FAILED: {type(err).__name__}: {err}")
            results[name] = {"error": f"{type(err).__name__}: {err}"}
            continue
        results[name] = data
        render(data)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump(results, handle, indent=2, ensure_ascii=False)
        print(f"\nwrote {args.json}")


if __name__ == "__main__":
    main()
