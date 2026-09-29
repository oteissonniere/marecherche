# Icon sources

Every icon of the project is generated from the SVG files in this folder:

```bash
python3 scripts/make_icons.py
```

| File | Used for |
|---|---|
| `layers/1-background.svg` | App icon: full-bleed, opaque gradient |
| `layers/2-lens.svg` | App icon: translucent lens |
| `layers/3-loupe.svg` | App icon: ring and handle |
| `layers/4-monogram.svg` | App icon: "mr", drawn as strokes (no font involved) |
| `toolbar.svg` | Safari toolbar and extension icons, 16 to 512 px (no text, heavier strokes) |
| `app-icon.svg` | Generated: the four layers flattened, used by the README |

The script composes the layers into a square icon for iOS and iPadOS (the system applies
the rounded mask), a rounded icon on the macOS 11–15 grid for macOS, the in-app logo, and
the extension icons. Rendering uses AppKit (`scripts/render_svg.swift`), so it needs
macOS with Xcode and no other tool.

## Design rules (Apple Human Interface Guidelines, App icons)

- Layers are square and unmasked: the system masks iOS, iPadOS and macOS icons itself.
- No baked-in gloss, glow or shadow: with Liquid Glass the system adds specular
  highlights, refraction and translucency to each layer.
- No live text: the monogram is a path, so rendering never depends on an installed font.
- Content stays centred, clear of the corners the mask removes.

## Liquid Glass icon (iOS, iPadOS and macOS 26 and later)

The PNG icons are flattened and look right everywhere. For the full Liquid Glass
treatment and the dark, clear and tinted appearances, build an Icon Composer file:

1. Open Icon Composer (Xcode → Open Developer Tool → Icon Composer).
2. Set the background to the gradient `#6366F1 → #3B82F6 → #06B6D4` (top-left to
   bottom-right), or import `layers/1-background.svg`.
3. Import `2-lens.svg`, `3-loupe.svg` and `4-monogram.svg` as foreground layers, in
   that order. Tune the lens translucency and the glass effects there.
4. Check the dark, clear and tinted previews, then save as `App/AppIcon.icon`.
5. Add the `.icon` file to the app targets in `project.yml` and set
   `ASSETCATALOG_COMPILER_APPICON_NAME` accordingly.
