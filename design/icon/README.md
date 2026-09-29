# Icon sources

The app icon is **`App/AppIcon.icon`**, an Icon Composer file built from the layers in
this folder. Xcode renders it for every platform, size and appearance, and generates
images for the OS versions without Liquid Glass (macOS 14–15, iOS and iPadOS 17–18).

The other icons (in-app logo, Safari extension icons) are generated from the SVG files:

```bash
python3 scripts/make_icons.py
```

| File | Used for |
|---|---|
| `layers/1-background.svg` | Flattened logo only; in Icon Composer the background is the icon's own gradient fill |
| `layers/2-lens.svg` | App icon: translucent lens |
| `layers/3-loupe.svg` | App icon: ring and handle |
| `layers/4-monogram.svg` | App icon: "mr", drawn as strokes (no font involved) |
| `toolbar.svg` | Safari toolbar and extension icons, 16 to 512 px (no text, heavier strokes) |
| `app-icon.svg` | Generated: the four layers flattened, used by the README |

The script flattens the layers into the in-app logo and renders the extension icons.
Rendering uses AppKit (`scripts/render_svg.swift`), so it needs macOS with Xcode and no
other tool.

## Design rules (Apple Human Interface Guidelines, App icons)

- Layers are square and unmasked: the system masks iOS, iPadOS and macOS icons itself.
- No baked-in gloss, glow or shadow: with Liquid Glass the system adds specular
  highlights, refraction and translucency to each layer.
- No live text: the monogram is a path, so rendering never depends on an installed font.
- Content stays centred, clear of the corners the mask removes.

## Editing the app icon

Open `App/AppIcon.icon` in Icon Composer (Xcode → Open Developer Tool → Icon Composer).
Current settings:

- background: the icon's gradient fill, `#6366F1` → `#06B6D4`, top to bottom;
- groups, front to back: `4-monogram` (Liquid Glass off, so the letters stay crisp),
  `3-loupe`, `2-lens`.

To change the artwork, edit the SVG layer here, then use Replace in the Image pop-up of
the layer in Icon Composer. Icon Composer renders every size from one design, so "mr"
is not legible in the 16 and 32 pt macOS sizes (Finder list view, Spotlight, menus).
