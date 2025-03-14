#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TemplateMigrator, NSObject)
RCT_EXTERN_METHOD(migrateCustomTemplates:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
