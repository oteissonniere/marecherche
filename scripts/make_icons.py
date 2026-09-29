#!/usr/bin/env python3
"""Generate every icon of the project from the SVG sources in design/icon/.

- App icon (iOS, iPadOS): the four layers composed into one square, full-bleed, opaque
  image; the system applies the rounded mask.
- App icon (macOS): the same artwork inside the rounded-rectangle grid used by
  pre-Liquid Glass macOS (824 px shape on a 1024 px canvas), so it looks right on
  macOS 14 and 15. For macOS 26+, build an Icon Composer file from the layers.
- In-app logo: the square app icon (the SwiftUI view rounds it).
- Safari extension icons: design/icon/toolbar.svg, no text, 16 to 512 px.

Also writes design/icon/app-icon.svg (the flattened square icon) for the README.
Rendering is done by scripts/render_svg.swift (AppKit), so macOS with Xcode is required.
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design" / "icon"
LAYERS = sorted((DESIGN / "layers").glob("*.svg"))
WEBEXT_ICONS = ROOT / "webext" / "src" / "icons"
ASSETS = ROOT / "App" / "Assets.xcassets"
WEBEXT_SIZES = [16, 32, 48, 64, 96, 128, 256, 512]
MAC_SIZES = [16, 32, 128, 256, 512]

# macOS 11-15 icon grid: 824 x 824 rounded rectangle centred on a 1024 x 1024 canvas.
MAC_INSET = 100
MAC_SCALE = 824 / 1024
MAC_RADIUS = 185


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


def compose_macos():
    body = "\n".join(svg_body(layer) for layer in LAYERS)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
        f'<defs><clipPath id="mr-mac"><rect x="{MAC_INSET}" y="{MAC_INSET}" width="824" height="824" '
        f'rx="{MAC_RADIUS}"/></clipPath></defs>\n'
        f'<g clip-path="url(#mr-mac)"><g transform="translate({MAC_INSET} {MAC_INSET}) scale({MAC_SCALE})">\n'
        f"{body}\n</g></g>\n</svg>\n"
    )


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main():
    if len(LAYERS) != 4:
        raise SystemExit(f"expected 4 layers in {DESIGN / 'layers'}, found {len(LAYERS)}")

    square_svg = DESIGN / "app-icon.svg"
    square_svg.write_text(compose_square(), encoding="utf-8")

    appicon = ASSETS / "AppIcon.appiconset"
    logo = ASSETS / "Logo.imageset"
    for stale in list(appicon.glob("*.png")) + list(logo.glob("*.png")):
        stale.unlink()

    with tempfile.TemporaryDirectory() as tmp:
        mac_svg = Path(tmp) / "app-icon-macos.svg"
        mac_svg.write_text(compose_macos(), encoding="utf-8")
        toolbar_svg = DESIGN / "toolbar.svg"

        jobs = [(square_svg, appicon / "icon-ios-1024.png", 1024, "opaque")]
        images = [{"filename": "icon-ios-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}]
        for points in MAC_SIZES:
            for scale in (1, 2):
                px = points * scale
                name = f"icon-mac-{points}@{scale}x.png"
                jobs.append((mac_svg, appicon / name, px, "alpha"))
                images.append({"filename": name, "idiom": "mac", "scale": f"{scale}x", "size": f"{points}x{points}"})

        logo_images = []
        for scale in (1, 2, 3):
            name = f"logo@{scale}x.png"
            jobs.append((square_svg, logo / name, 64 * scale, "opaque"))
            logo_images.append({"filename": name, "idiom": "universal", "scale": f"{scale}x"})

        for size in WEBEXT_SIZES:
            jobs.append((toolbar_svg, WEBEXT_ICONS / f"icon-{size}.png", size, "alpha"))

        payload = "".join(f"{svg}\t{png}\t{size}\t{mode}\n" for svg, png, size, mode in jobs)
        subprocess.run(["swift", str(ROOT / "scripts" / "render_svg.swift")],
                       input=payload, text=True, check=True)

    write_json(appicon / "Contents.json", {"images": images, "info": {"author": "xcode", "version": 1}})
    write_json(logo / "Contents.json", {"images": logo_images, "info": {"author": "xcode", "version": 1}})
    write_json(ASSETS / "Contents.json", {"info": {"author": "xcode", "version": 1}})
    print(f"{len(jobs)} icons rendered from {DESIGN.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
