// Renders SVG files to sRGB PNGs with AppKit (NSImage reads SVG natively), so icon
// generation needs no third-party tool. Driven by scripts/make_icons.py.
//
// stdin, one job per line, tab-separated: <svg path> <png path> <pixel size> <opaque|alpha>
// "opaque" drops the alpha channel, as required for iOS app icons.
import AppKit

func render(svg: String, png: String, size: Int, opaque: Bool) throws {
    guard let image = NSImage(contentsOfFile: svg) else {
        throw NSError(domain: "render_svg", code: 1, userInfo: [NSLocalizedDescriptionKey: "cannot read \(svg)"])
    }
    // AppKit cannot draw into a bitmap without alpha, so always draw RGBA and flatten
    // afterwards when an opaque image is requested.
    guard let blank = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
        samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
          let rep = blank.retagging(with: .sRGB) else {
        throw NSError(domain: "render_svg", code: 2, userInfo: [NSLocalizedDescriptionKey: "cannot allocate \(size) px bitmap"])
    }
    rep.size = NSSize(width: size, height: size)

    NSGraphicsContext.saveGraphicsState()
    defer { NSGraphicsContext.restoreGraphicsState() }
    let context = NSGraphicsContext(bitmapImageRep: rep)
    context?.imageInterpolation = .high
    NSGraphicsContext.current = context
    image.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
    context?.flushGraphics()

    let output = opaque ? try flatten(rep, size: size) : rep
    guard let data = output.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "render_svg", code: 3, userInfo: [NSLocalizedDescriptionKey: "cannot encode \(png)"])
    }
    let url = URL(fileURLWithPath: png)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: url)
}

// Copies an RGBA bitmap into an RGB one with no alpha channel (sRGB, 8 bits per sample).
func flatten(_ rep: NSBitmapImageRep, size: Int) throws -> NSBitmapImageRep {
    guard let source = rep.cgImage,
          let space = CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                                  bytesPerRow: 0, space: space,
                                  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
        throw NSError(domain: "render_svg", code: 4, userInfo: [NSLocalizedDescriptionKey: "cannot flatten bitmap"])
    }
    context.draw(source, in: CGRect(x: 0, y: 0, width: size, height: size))
    guard let flat = context.makeImage() else {
        throw NSError(domain: "render_svg", code: 5, userInfo: [NSLocalizedDescriptionKey: "cannot flatten bitmap"])
    }
    return NSBitmapImageRep(cgImage: flat)
}

var failures = 0
while let line = readLine() {
    let fields = line.split(separator: "\t").map(String.init)
    guard fields.count == 4, let size = Int(fields[2]) else { continue }
    do {
        try render(svg: fields[0], png: fields[1], size: size, opaque: fields[3] == "opaque")
    } catch {
        failures += 1
        FileHandle.standardError.write("error: \(error.localizedDescription)\n".data(using: .utf8)!)
    }
}
exit(failures == 0 ? 0 : 1)
