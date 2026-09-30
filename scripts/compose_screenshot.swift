// Composes an App Store screenshot: the app icon gradient, a caption on top, and a raw
// screenshot below it with rounded corners and a soft shadow.
//
//   swift scripts/compose_screenshot.swift <raw.png> <out.png> <width> <height> "<caption>"
//
// The output has exactly <width> x <height> pixels, opaque (App Store Connect rejects
// images with an alpha channel).
import AppKit

let args = CommandLine.arguments
guard args.count == 6, let width = Int(args[3]), let height = Int(args[4]),
      let raw = NSImage(contentsOfFile: args[1]) else {
    FileHandle.standardError.write("usage: compose_screenshot <raw.png> <out.png> <width> <height> <caption>\n".data(using: .utf8)!)
    exit(2)
}
let caption = args[5]
let W = CGFloat(width), H = CGFloat(height)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: W, height: H)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

// Background: the icon gradient, top to bottom (AppKit's origin is bottom-left).
let gradient = NSGradient(starting: NSColor(srgbRed: 0x63 / 255, green: 0x66 / 255, blue: 0xF1 / 255, alpha: 1),
                          ending: NSColor(srgbRed: 0x06 / 255, green: 0xB6 / 255, blue: 0xD4 / 255, alpha: 1))!
gradient.draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: -90)

// Caption, centred in the top band.
let short = min(W, H)
let band = H * (W < H ? 0.17 : 0.16)
let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
paragraph.lineBreakMode = .byWordWrapping
let font = NSFont.systemFont(ofSize: short * 0.068, weight: .bold)
let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white, .paragraphStyle: paragraph]
let text = NSAttributedString(string: caption, attributes: attributes)
let textWidth = W * 0.86
let textSize = text.boundingRect(with: NSSize(width: textWidth, height: band), options: [.usesLineFragmentOrigin])
text.draw(with: NSRect(x: (W - textWidth) / 2, y: H - band + (band - textSize.height) / 2 - band * 0.05,
                       width: textWidth, height: textSize.height), options: [.usesLineFragmentOrigin])

// Screenshot, scaled to fit below the caption.
let margin = short * 0.07
let availableWidth = W - 2 * margin
let availableHeight = H - band - margin
let scale = min(availableWidth / raw.size.width, availableHeight / raw.size.height)
let shotSize = NSSize(width: raw.size.width * scale, height: raw.size.height * scale)
let shotRect = NSRect(x: (W - shotSize.width) / 2, y: H - band - shotSize.height,
                      width: shotSize.width, height: shotSize.height)
// A macOS window capture (⌘⇧4, Space) is transparent around the window and already has
// rounded corners and a shadow: draw it as is. Device captures are opaque rectangles.
let isWindowCapture = raw.representations.contains { $0.hasAlpha }
let radius = isWindowCapture ? 0 : short * 0.055
let clip = NSBezierPath(roundedRect: shotRect, xRadius: radius, yRadius: radius)

NSGraphicsContext.saveGraphicsState()
if isWindowCapture { NSBezierPath(rect: .zero).addClip() }
let shadow = NSShadow()
shadow.shadowColor = NSColor(white: 0, alpha: 0.35)
shadow.shadowBlurRadius = short * 0.03
shadow.shadowOffset = NSSize(width: 0, height: -short * 0.01)
shadow.set()
NSColor.black.setFill()
clip.fill()
NSGraphicsContext.restoreGraphicsState()

NSGraphicsContext.saveGraphicsState()
clip.addClip()
raw.draw(in: shotRect, from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

NSGraphicsContext.restoreGraphicsState()

// Flatten to opaque RGB.
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                        space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
context.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: width, height: height))
let opaque = NSBitmapImageRep(cgImage: context.makeImage()!)
try! opaque.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
