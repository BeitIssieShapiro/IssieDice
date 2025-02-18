import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Set the module name that the root view controller will use.
    self.moduleName = "IssieDice"
    self.dependencyProvider = RCTAppDependencyProvider()

    // Check for an initial URL from launch options and pass it as initialProps.
    if let url = launchOptions?[.url] as? URL {
      self.initialProps = ["url": url.absoluteString]
    } else {
      self.initialProps = [:]
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Handle incoming URL events (deep links)
  override func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(application, open: url, options: options)
  }

  // Provide the source URL for the JS bundle
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}