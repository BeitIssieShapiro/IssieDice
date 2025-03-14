import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import CoreData

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
//    #if targetEnvironment(macCatalyst)
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
//    #else
//    return URL(string: "http://192.168.0.228:8081/index.bundle?platform=ios&dev=true")
//    #endif
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
  
  lazy var applicationDocumentsDirectory: URL = {
      // The directory the application uses to store the Core Data store file. This code uses a directory named "Inc.Inc.forCoreDataStub" in the application's documents Application Support directory.
      let urls = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
      return urls[urls.count-1]
  }()
  
  lazy var managedObjectModel: NSManagedObjectModel = {
      // The managed object model for the application. This property is not optional. It is a fatal error for the application not to be able to find and load its model.
      let modelURL = Bundle.main.url(forResource: "IssieDice", withExtension: "momd")!
      return NSManagedObjectModel(contentsOf: modelURL)!
  }()
  
  lazy var persistentStoreCoordinator: NSPersistentStoreCoordinator = {
      // The persistent store coordinator for the application. This implementation creates and returns a coordinator, having added the store for the application to it. This property is optional since there are legitimate error conditions that could cause the creation of the store to fail.
      // Create the coordinator and store
      let coordinator = NSPersistentStoreCoordinator(managedObjectModel: self.managedObjectModel)
      let url = self.applicationDocumentsDirectory.appendingPathComponent("IssieDice.sqlite")
      var failureReason = "There was an error creating or loading the application's saved data."
      do {
          try coordinator.addPersistentStore(ofType: NSSQLiteStoreType, configurationName: nil, at: url, options: nil)
      } catch {
          // Report any error we got.
          var dict = [String: AnyObject]()
          dict[NSLocalizedDescriptionKey] = "Failed to initialize the application's saved data" as AnyObject?
          dict[NSLocalizedFailureReasonErrorKey] = failureReason as AnyObject?
          
          dict[NSUnderlyingErrorKey] = error as NSError
          let wrappedError = NSError(domain: "YOUR_ERROR_DOMAIN", code: 9999, userInfo: dict)
          // Replace this with code to handle the error appropriately.
          // abort() causes the application to generate a crash log and terminate. You should not use this function in a shipping application, although it may be useful during development.
          NSLog("Unresolved error \(wrappedError), \(wrappedError.userInfo)")
          abort()
      }
      
      return coordinator
  }()
  
  lazy var managedObjectContext: NSManagedObjectContext = {
      // Returns the managed object context for the application (which is already bound to the persistent store coordinator for the application.) This property is optional since there are legitimate error conditions that could cause the creation of the context to fail.
      let coordinator = self.persistentStoreCoordinator
      var managedObjectContext = NSManagedObjectContext(concurrencyType: .mainQueueConcurrencyType)
      managedObjectContext.persistentStoreCoordinator = coordinator
      return managedObjectContext
  }()
  
  
}
