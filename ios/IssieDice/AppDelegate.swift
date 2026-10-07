import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  
  
  
  func application(
     _ application: UIApplication,
     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
   ) -> Bool {
     let delegate = ReactNativeDelegate()
     let factory = RCTReactNativeFactory(delegate: delegate)
     delegate.dependencyProvider = RCTAppDependencyProvider()

     reactNativeDelegate = delegate
     reactNativeFactory = factory

     // the window and React Native are started by SceneDelegate (UIScene life cycle is required)
     return true
   }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  func startReactNative(in window: UIWindow, launchURL: URL?) {
    let launchTime = Date().timeIntervalSince1970 * 1000 // ms

    // Extract and prepare initial URL if exists
    var initialProps: [AnyHashable: Any] = ["nativeStartTime": launchTime]
    if let url = launchURL,
       let tempURL = securelyCopyToTemp(url: url) {
      initialProps["url"] = tempURL.absoluteString
    }

    reactNativeFactory?.startReactNative(
      withModuleName: "IssieDice",
      in: window,
      initialProperties: initialProps,
      launchOptions: nil
    )
  }

  func openURL(_ url: URL) {
    guard let tempURL = securelyCopyToTemp(url: url) else { return }
    _ = RCTLinkingManager.application(UIApplication.shared, open: tempURL, options: [:])
  }

  func securelyCopyToTemp(url: URL) -> URL? {
    let hasAccess = url.startAccessingSecurityScopedResource()
    defer {
      if hasAccess {
        url.stopAccessingSecurityScopedResource()
      }
    }

    do {
      let fileName = url.lastPathComponent.removingPercentEncoding ?? url.lastPathComponent
      let sanitizedFileName = fileName.replacingOccurrences(of: "/", with: "-")
      let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(sanitizedFileName)

      if FileManager.default.fileExists(atPath: tempURL.path) {
        try FileManager.default.removeItem(at: tempURL)
      }

      try FileManager.default.copyItem(at: url, to: tempURL)
      print("✅ File copied to temp: \(tempURL.path)")
      return tempURL
    } catch {
      print("❌ Error copying file to temp: \(error)")
      return nil
    }
  }
  
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene, let appDelegate = appDelegate else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // some libraries look for the window on the app delegate
    appDelegate.window = window

    appDelegate.startReactNative(in: window, launchURL: connectionOptions.urlContexts.first?.url)
  }

  // replaces application(_:open:options:) under the UIScene life cycle
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    appDelegate?.openURL(url)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
