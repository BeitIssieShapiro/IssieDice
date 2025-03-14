//
//  TemplateMigrator.swift
//  IssieDice
//
//  Created by Ariel Bentolila on 14/03/2025.
//


import Foundation
import CoreData
import React
import UIKit

@objc(TemplateMigrator)
class TemplateMigrator: NSObject {
  
  // This tells React Native that this module must be initialized on the main queue.
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  // The migrateCustomTemplates method fetches all "CustomDice" objects from Core Data.
  // It returns a promise to JS, resolving with an array of dictionaries.
  @objc(migrateCustomTemplates:rejecter:)
  func migrateCustomTemplates(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // Get the AppDelegate's managed object context.
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      reject("no_app_delegate", "Could not get AppDelegate", nil)
      return
    }
    
    // Access the managed object context.
    let context = appDelegate.managedObjectContext
    
    // Create a fetch request for the "CustomDice" entity.
    let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: "CustomDice")
    
    do {
      let results = try context.fetch(fetchRequest)
      var templates: [[String: Any]] = []
      for object in results {
        // Extract fields.
        let iName = object.value(forKey: "iName") as? String ?? ""
        let iPic1Data = object.value(forKey: "iPic1") as? Data
        let iPic2Data = object.value(forKey: "iPic2") as? Data
        let iPic3Data = object.value(forKey: "iPic3") as? Data
        let iPic4Data = object.value(forKey: "iPic4") as? Data
        let iPic5Data = object.value(forKey: "iPic5") as? Data
        let iPic6Data = object.value(forKey: "iPic6") as? Data
        
        // Convert image data to Base64-encoded strings.
        let iPic1 = iPic1Data?.base64EncodedString() ?? ""
        let iPic2 = iPic2Data?.base64EncodedString() ?? ""
        let iPic3 = iPic3Data?.base64EncodedString() ?? ""
        let iPic4 = iPic4Data?.base64EncodedString() ?? ""
        let iPic5 = iPic5Data?.base64EncodedString() ?? ""
        let iPic6 = iPic6Data?.base64EncodedString() ?? ""
        
        let templateDict: [String: Any] = [
          "iName": iName,
          "iPic1": iPic1,
          "iPic2": iPic2,
          "iPic3": iPic3,
          "iPic4": iPic4,
          "iPic5": iPic5,
          "iPic6": iPic6
        ]
        templates.append(templateDict)
      }
      resolve(templates)
    } catch let error as NSError {
      reject("fetch_error", "Could not fetch custom dice: \(error.localizedDescription)", error)
    }
  }
}
