#!/usr/bin/env python3
"""Generate the raster icons of the project from the SVG sources in design/icon/.

The app icon itself is App/AppIcon.icon, an Icon Composer file built from the layers in
design/icon/layers/; Xcode renders it for every platform, size and appearance, and
generates images for OS versions without Liquid Glass. This script produces the rest:

- In-app logo: the four layers flattened into a square (the SwiftUI view rounds it).
- Popup header icon: the same flattened square at 48, 96 and 144 px (the CSS rounds it).
- Safari extension icons: design/icon/toolbar.svg, no text, 16 to 512 px.

Also writes design/icon/app-icon.svg (the flattened square icon) for the README.
Rendering is done by scripts/render_svg.swift (AppKit), so macOS with Xcode is required.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design" / "icon"
LAYERS = sorted((DESIGN / "layers").glob("*.svg"))
WEBEXT_ICONS = ROOT / "webext" / "src" / "icons"
ASSETS = ROOT / "App" / "Assets.xcassets"
WEBEXT_SIZES = [16, 32, 48, 64, 96, 128, 256, 512]
POPUP_ICON_SIZES = [48, 96, 144]  # 1x, 2x, 3x sources for the 36 px header icon (oversampled)


def svg_body(path):
    """Inner markup of an SVG file (everything between the root tags)."""
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    match = re.search(r"<svg[^>]*>(.*)</svg>", text, flags=re.S)
    if not match:
        raise SystemExit(f"not an SVG: {path}")
    return match.group(1).strip()


def compose_square():
    body = "\n".join(svg_body(layer) for layer in LAYERS)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" '
            f'width="1024" height="1024">\n{body}\n</svg>\n')


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main():
    if len(LAYERS) != 4:
        raise SystemExit(f"expected 4 layers in {DESIGN / 'layers'}, found {len(LAYERS)}")

    square_svg = DESIGN / "app-icon.svg"
    square_svg.write_text(compose_square(), encoding="utf-8")

    logo = ASSETS / "Logo.imageset"
    for stale in logo.glob("*.png"):
        stale.unlink()

    jobs = []
    logo_images = []
    for scale in (1, 2, 3):
        name = f"logo@{scale}x.png"
        jobs.append((square_svg, logo / name, 64 * scale, "opaque"))
        logo_images.append({"filename": name, "idiom": "universal", "scale": f"{scale}x"})

    for size in POPUP_ICON_SIZES:
        jobs.append((square_svg, WEBEXT_ICONS / f"app-icon-{size}.png", size, "opaque"))

    toolbar_svg = DESIGN / "toolbar.svg"
    for size in WEBEXT_SIZES:
        jobs.append((toolbar_svg, WEBEXT_ICONS / f"icon-{size}.png", size, "alpha"))

    payload = "".join(f"{svg}\t{png}\t{size}\t{mode}\n" for svg, png, size, mode in jobs)
    subprocess.run(["swift", str(ROOT / "scripts" / "render_svg.swift")],
                   input=payload, text=True, check=True)

    write_json(logo / "Contents.json", {"images": logo_images, "info": {"author": "xcode", "version": 1}})
    write_json(ASSETS / "Contents.json", {"info": {"author": "xcode", "version": 1}})
    print(f"{len(jobs)} icons rendered from {DESIGN.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
