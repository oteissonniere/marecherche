import SwiftUI
#if os(macOS)
import SafariServices
#endif

private let extensionBundleIdentifier = "eu.teissonniere.marecherche.Extension"
private let repositoryURL = URL(string: "https://github.com/oteissonniere/marecherche")!
private let contactURL = URL(string: "mailto:marecherche@teissonniere.eu")!

struct ContentView: View {
    #if os(iOS)
    @Environment(\.openURL) private var openURL
    #endif
    @State private var settingsError: String?

    private var steps: [LocalizedStringKey] {
        #if os(macOS)
        [
            "Open Safari settings, then the Extensions tab.",
            "Enable “Ma recherche”.",
            "Choose “Always Allow on Every Website” so search engines can be redirected.",
            "Click the extension icon in Safari's toolbar to set your private instance."
        ]
        #else
        [
            "Open Settings → Apps → Safari → Extensions.",
            "Enable “Ma recherche”.",
            "Set “All Websites” to Allow so search engines can be redirected.",
            "In Safari, tap the extension icon to set your private instance."
        ]
        #endif
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                        StepRow(number: index + 1, text: step)
                    }
                }
                settingsButton
                if let settingsError {
                    Text(settingsError)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Divider()
                footer
            }
            .padding(24)
            .frame(maxWidth: 520, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        #if os(macOS)
        .frame(width: 520)
        .frame(minHeight: 460)
        #endif
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 16) {
            Image("Logo")
                .resizable()
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text("Ma recherche")
                    .font(.title.bold())
                Text("Sends Safari address-bar searches to your private SearXNG instance, and to a public engine when it is unreachable.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    @ViewBuilder
    private var settingsButton: some View {
        #if os(macOS)
        Button("Open Safari Extensions Settings") {
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                // Surface the failure instead of silently doing nothing (e.g. extension not
                // yet registered by Safari, or a bundle identifier mismatch).
                settingsError = error.map {
                    String(localized: "Safari could not open the extension settings: \($0.localizedDescription)")
                }
            }
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        #else
        Button("Open Settings") {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                openURL(url)
            }
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        #endif
    }

    private var footer: some View {
        HStack(spacing: 6) {
            Text("Open source — MIT")
            Link("GitHub", destination: repositoryURL)
            Text("·")
            Link("Contact", destination: contactURL)
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
}

private struct StepRow: View {
    let number: Int
    let text: LocalizedStringKey

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text("\(number)")
                .font(.subheadline.monospacedDigit().bold())
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.accentColor))
                .accessibilityHidden(true)
            Text(text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    ContentView()
}
