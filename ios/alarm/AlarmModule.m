#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UIKit/UIKit.h>

// The notification delegate must be set before launch finishes, or a tap on an alarm
// notification that launches the app is lost. JS creates the module lazily, so install
// it here instead of requiring an AppDelegate change in every app.
@interface RNAlarmBootstrap : NSObject
@end

@implementation RNAlarmBootstrap

+ (void)load
{
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification
                                                    object:nil
                                                     queue:nil
                                                usingBlock:^(NSNotification *note) {
    Class backend = NSClassFromString(@"RNAlarmNotificationBackend");
    SEL install = NSSelectorFromString(@"install");
    if ([backend respondsToSelector:install]) {
      ((void (*)(id, SEL))[backend methodForSelector:install])(backend, install);
    }
  }];
}

@end

// Exposes the Swift `AlarmModule` to JS as `NativeModules.Alarm`, the same name
// as Android's `AlarmModule.NAME`. Method names and signatures match Android.
@interface RCT_EXTERN_REMAP_MODULE(Alarm, AlarmModule, RCTEventEmitter)

// ---------- Permissions ----------
RCT_EXTERN_METHOD(checkPermission:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(canScheduleExactAlarms:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(openAutoStartSettings:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// ---------- Scheduling ----------
RCT_EXTERN_METHOD(scheduleAlarm:(NSDictionary *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(updateAlarm:(NSString *)alarmId
                  config:(NSDictionary *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancelAlarm:(NSString *)alarmId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancelAllAlarms:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// ---------- Control (while ringing) ----------
RCT_EXTERN_METHOD(stopAlarm:(NSString *)alarmId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(snoozeAlarm:(NSString *)alarmId
                  minutes:(double)minutes
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getRingingAlarm:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// ---------- Queries ----------
RCT_EXTERN_METHOD(getAlarm:(NSString *)alarmId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getAllAlarms:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isScheduled:(NSString *)alarmId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
