// Compiles every regex read from stdin (one per line) with WebKit's content-extension
// compiler — the same one Safari uses for declarativeNetRequest `regexFilter`.
// Exit status is non-zero if any regex is rejected. Driven by scripts/check_regexes.sh.
import WebKit
import Foundation

var regexes: [String] = []
while let line = readLine(), !line.isEmpty { regexes.append(line) }
guard !regexes.isEmpty else { print("no regex on stdin"); exit(2) }

let storeURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("marecherche-rx-\(getpid())")
let store = WKContentRuleListStore(url: storeURL)!
var failures = 0
let group = DispatchGroup()

for (index, regex) in regexes.enumerated() {
    group.enter()
    let rule: [[String: Any]] = [["trigger": ["url-filter": regex], "action": ["type": "block"]]]
    let json = String(data: try! JSONSerialization.data(withJSONObject: rule), encoding: .utf8)!
    store.compileContentRuleList(forIdentifier: "rx\(index)", encodedContentRuleList: json) { _, error in
        if let error {
            failures += 1
            print("FAIL \(regex)\n     \(error.localizedDescription)")
        } else {
            print("OK   \(regex)")
        }
        group.leave()
    }
}

group.notify(queue: .main) {
    try? FileManager.default.removeItem(at: storeURL)
    print(failures == 0 ? "all \(regexes.count) regexes compile" : "\(failures) regex(es) rejected")
    exit(failures == 0 ? 0 : 1)
}
RunLoop.main.run()
