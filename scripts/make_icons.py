#!/usr/bin/env python3
"""Generate placeholder icons (magnifying glass on a rounded blue tile).

Standard library only. Writes the WebExtension icons, the app icon set and the in-app logo.
Replace these with real artwork before release (milestone M4).
"""
import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEBEXT_ICONS = ROOT / "webext" / "src" / "icons"
ASSETS = ROOT / "App" / "Assets.xcassets"

BACKGROUND = (10, 108, 255)
GLYPH = (255, 255, 255)
WEBEXT_SIZES = [16, 32, 48, 64, 96, 128, 256, 512]


def write_png(path, size, pixels):
    """pixels: bytes of size*size RGBA."""
    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    stride = size * 4
    raw = b"".join(b"\x00" + pixels[y * stride:(y + 1) * stride] for y in range(size))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def clamp(value):
    return max(0.0, min(1.0, value))


def segment_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def render(size, rounded=True):
    """Distance-field rendering in unit coordinates, one-pixel anti-aliasing."""
    aa = 1.0 / size
    radius = 0.225 if rounded else 0.0
    lens_x, lens_y, lens_r, stroke = 0.43, 0.43, 0.20, 0.075
    handle = (0.585, 0.585, 0.78, 0.78)
    out = bytearray()
    for y in range(size):
        v = (y + 0.5) / size
        for x in range(size):
            u = (x + 0.5) / size
            # Rounded-square coverage.
            qx, qy = abs(u - 0.5) - (0.5 - radius), abs(v - 0.5) - (0.5 - radius)
            outside = (max(qx, 0.0) ** 2 + max(qy, 0.0) ** 2) ** 0.5 + min(max(qx, qy), 0.0) - radius
            tile = clamp(0.5 - outside / aa)
            # Glyph coverage: ring + handle.
            ring = abs(((u - lens_x) ** 2 + (v - lens_y) ** 2) ** 0.5 - lens_r) - stroke / 2
            bar = segment_distance(u, v, *handle) - stroke / 2
            glyph = clamp(0.5 - min(ring, bar) / aa)
            out += bytes(round(BACKGROUND[i] + (GLYPH[i] - BACKGROUND[i]) * glyph) for i in range(3))
            out.append(round(255 * tile))
    return bytes(out)


def main():
    cache = {}

    def pixels(size, rounded=True):
        key = (size, rounded)
        if key not in cache:
            cache[key] = render(size, rounded)
        return cache[key]

    for size in WEBEXT_SIZES:
        write_png(WEBEXT_ICONS / f"icon-{size}.png", size, pixels(size))

    appicon = ASSETS / "AppIcon.appiconset"
    # iOS applies its own mask: the 1024 source must be a full-bleed square.
    write_png(appicon / "icon-ios-1024.png", 1024, pixels(1024, rounded=False))
    images = [{"filename": "icon-ios-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}]
    for points in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            px = points * scale
            name = f"icon-mac-{px}.png"
            write_png(appicon / name, px, pixels(px))
            images.append({"filename": name, "idiom": "mac", "scale": f"{scale}x", "size": f"{points}x{points}"})
    (appicon / "Contents.json").write_text(json.dumps(
        {"images": images, "info": {"author": "xcode", "version": 1}}, indent=2) + "\n")

    logo = ASSETS / "Logo.imageset"
    logo_images = []
    for scale in (1, 2, 3):
        name = f"logo@{scale}x.png"
        write_png(logo / name, 64 * scale, pixels(64 * scale, rounded=False))
        logo_images.append({"filename": name, "idiom": "universal", "scale": f"{scale}x"})
    (logo / "Contents.json").write_text(json.dumps(
        {"images": logo_images, "info": {"author": "xcode", "version": 1}}, indent=2) + "\n")

    (ASSETS / "Contents.json").write_text(json.dumps(
        {"info": {"author": "xcode", "version": 1}}, indent=2) + "\n")
    print(f"icons written to {WEBEXT_ICONS.relative_to(ROOT)} and {ASSETS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
