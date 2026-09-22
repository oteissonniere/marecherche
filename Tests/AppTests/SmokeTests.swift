import XCTest

final class SmokeTests: XCTestCase {
    // The test bundle is hosted by the app, so Bundle.main is the app bundle.
    func testHostAppBundleIdentifier() {
        XCTAssertEqual(Bundle.main.bundleIdentifier, "eu.teissonniere.marecherche")
    }
}
