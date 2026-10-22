import Foundation
import React
import UIKit
import UserNotifications

/// iOS counterpart of the Android `AlarmModule`: same JS name (`Alarm`), same method
/// names, same payload shapes and the same `onAlarmFired` / `onAlarmDismissed` /
/// `onAlarmSnoozed` events, so JS code is shared between the platforms.
///
/// Backend: AlarmKit on iOS 26+ once the user grants alarm access (real alarms that
/// ring through silent mode); local notifications everywhere else.
@objc(AlarmModule)
final class AlarmModule: RCTEventEmitter {
  static let eventFired = "onAlarmFired"
  static let eventDismissed = "onAlarmDismissed"
  static let eventSnoozed = "onAlarmSnoozed"

  private var hasListeners = false
  private var activeObserver: NSObjectProtocol?

  override init() {
    super.init()
    NotificationBackend.install()
    NotificationBackend.shared.onEvent = { [weak self] name, alarm in self?.handle(name, alarm) }
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      AlarmKitBackend.shared.onEvent = { [weak self] name, alarm in self?.handle(name, alarm) }
      AlarmKitBackend.shared.startObserving()
    }
    #endif
    // App launched by tapping the alarm notification/alert before this module existed.
    DispatchQueue.main.async { [weak self] in self?.presentIfRinging() }
    // Tapping an AlarmKit alert (and some notification taps on a warm start) only
    // foregrounds the app without any delegate callback, so also check on activation.
    activeObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
    ) { [weak self] _ in self?.presentIfRinging() }
  }

  deinit {
    if let activeObserver { NotificationCenter.default.removeObserver(activeObserver) }
  }

  /// Shows the ring screen when a backend says an alarm is ringing right now.
  private func presentIfRinging() {
    var ringing = NotificationBackend.shared.ringing
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *), ringing == nil { ringing = AlarmKitBackend.shared.ringingAlarm() }
    #endif
    if let ringing { AlarmRingPresenter.present(ringing, bridge: bridge) }
  }

  private func handle(_ name: String, _ alarm: AlarmData) {
    if name == Self.eventFired {
      AlarmRingPresenter.present(alarm, bridge: bridge)
    } else {
      AlarmRingPresenter.dismiss(alarm.id)
    }
    emit(name, alarm)
  }

  @objc override static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Events

  override func supportedEvents() -> [String]! {
    [Self.eventFired, Self.eventDismissed, Self.eventSnoozed]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func emit(_ name: String, _ a: AlarmData) {
    guard hasListeners else { return }
    sendEvent(withName: name, body: [
      "alarmId": a.id,
      "timestamp": AlarmData.now(),
      "title": a.title,
      "body": a.body,
      "data": a.data,
    ])
  }

  // MARK: - Backend selection

  private var useAlarmKit: Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) { return AlarmKitBackend.shared.isAuthorized }
    #endif
    return false
  }

  private func cancelNative(_ id: String) {
    AlarmRingPresenter.dismiss(id)
    NotificationBackend.shared.cancel(id)
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) { AlarmKitBackend.shared.cancel(id) }
    #endif
  }

  // MARK: - Permissions

  /// Same keys as Android's `permissionMap()`. The Android-only flags are always
  /// true here so shared UI code can treat them as granted.
  private func permissionMap(_ done: @escaping ([String: Any]) -> Void) {
    NotificationBackend.shared.status { notifications in
      var status = notifications
      var backend = "notifications"
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        status = AlarmKitBackend.shared.status
        backend = "alarmkit"
      }
      #endif
      done([
        "status": status,
        "notifications": status == "granted" || notifications == "granted",
        "canScheduleExact": status == "granted",
        "canDrawOverlays": true,
        "canUseFullScreenIntent": true,
        "backend": backend,
      ])
    }
  }

  private func notificationStatus() async -> String {
    await withCheckedContinuation { c in NotificationBackend.shared.status { c.resume(returning: $0) } }
  }

  private func requestNotifications() async {
    _ = await withCheckedContinuation { c in NotificationBackend.shared.request { c.resume(returning: $0) } }
  }

  /// iOS never re-prompts after a denial, so (like Android for its special
  /// permissions) send the user to the app's Settings page.
  @MainActor private func openSettings() {
    if let url = URL(string: UIApplication.openSettingsURLString) {
      UIApplication.shared.open(url)
    }
  }

  @objc(checkPermission:reject:)
  func checkPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    permissionMap { resolve($0) }
  }

  @objc(requestPermission:reject:)
  func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        let kit = AlarmKitBackend.shared
        if kit.status == "notDetermined" { _ = await kit.requestAuthorization() }
        if kit.isAuthorized {
          self.permissionMap { resolve($0) }
          return
        }
        await self.openSettings()
      }
      #endif
      // Notifications back the fallback path.
      let notifications = await self.notificationStatus()
      if notifications == "notDetermined" {
        await self.requestNotifications()
      } else if notifications == "denied" {
        await self.openSettings()
      }
      self.permissionMap { resolve($0) }
    }
  }

  @objc(canScheduleExactAlarms:reject:)
  func canScheduleExactAlarms(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    permissionMap { (map: [String: Any]) in
      resolve((map["canScheduleExact"] as? Bool) ?? false)
    }
  }

  /// Android OEM concept; iOS has no such screen.
  @objc(openAutoStartSettings:reject:)
  func openAutoStartSettings(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  // MARK: - Scheduling

  @objc(scheduleAlarm:resolve:reject:)
  func scheduleAlarm(_ config: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict = config as? [String: Any] ?? [:]
    let id = (dict["alarmId"] as? String) ?? UUID().uuidString
    arm(AlarmData.from(config: dict, id: id), code: "E_SCHEDULE", reject: reject) { resolve(id) }
  }

  @objc(updateAlarm:config:resolve:reject:)
  func updateAlarm(_ alarmId: String, config: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard AlarmStore.get(alarmId) != nil else { return resolve(false) }
    let dict = config as? [String: Any] ?? [:]
    arm(AlarmData.from(config: dict, id: alarmId), code: "E_UPDATE", reject: reject) { resolve(true) }
  }

  /// Cancel → persist → schedule, the same sequence as Android.
  private func arm(_ alarm: AlarmData, code: String, reject: @escaping RCTPromiseRejectBlock, done: @escaping () -> Void) {
    cancelNative(alarm.id)
    AlarmStore.save(alarm)

    #if canImport(AlarmKit)
    if #available(iOS 26.0, *), useAlarmKit {
      Task {
        do {
          try await AlarmKitBackend.shared.schedule(alarm)
          done()
        } catch {
          reject(code, error.localizedDescription, error)
        }
      }
      return
    }
    #endif

    NotificationBackend.shared.status { status in
      guard status == "granted" else {
        // Mirrors Android's SecurityException when the exact-alarm permission is missing.
        return reject(code, "Alarm permission not granted; call requestPermission() first", nil)
      }
      NotificationBackend.shared.schedule(alarm) { error in
        if let error { reject(code, error.localizedDescription, error) } else { done() }
      }
    }
  }

  @objc(cancelAlarm:resolve:reject:)
  func cancelAlarm(_ alarmId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let existed = AlarmStore.get(alarmId) != nil
    cancelNative(alarmId)
    AlarmStore.remove(alarmId)
    resolve(existed)
  }

  @objc(cancelAllAlarms:reject:)
  func cancelAllAlarms(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    AlarmRingPresenter.dismiss()
    AlarmStore.all().forEach { cancelNative($0.id) }
    NotificationBackend.shared.cancelAll()
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) { AlarmKitBackend.shared.cancelAll() }
    #endif
    AlarmStore.clear()
    resolve(nil)
  }

  // MARK: - Control (while ringing)

  @objc(stopAlarm:resolve:reject:)
  func stopAlarm(_ alarmId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    AlarmRingPresenter.dismiss(alarmId)
    NotificationBackend.shared.stop(alarmId)
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) { AlarmKitBackend.shared.stop(alarmId) }
    #endif
    resolve(nil)
  }

  @objc(snoozeAlarm:minutes:resolve:reject:)
  func snoozeAlarm(_ alarmId: String, minutes: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let alarm = AlarmStore.get(alarmId) else {
      return reject("E_NOT_FOUND", "Alarm \(alarmId) not found", nil)
    }
    let mins = minutes > 0 ? Int(minutes) : alarm.snoozeMinutes
    AlarmRingPresenter.dismiss(alarmId)

    #if canImport(AlarmKit)
    if #available(iOS 26.0, *), useAlarmKit {
      Task {
        do {
          try await AlarmKitBackend.shared.snooze(alarm, minutes: mins)
          resolve(nil)
        } catch {
          reject("E_SNOOZE", error.localizedDescription, error)
        }
      }
      return
    }
    #endif

    let wasRinging = NotificationBackend.shared.ringing?.id == alarmId
    NotificationBackend.shared.snooze(alarm, minutes: mins)
    if wasRinging { emit(Self.eventSnoozed, alarm) }
    resolve(nil)
  }

  /// The alarm currently ringing (if any), so JS can show the ring UI on launch.
  @objc(getRingingAlarm:reject:)
  func getRingingAlarm(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    var ringing = NotificationBackend.shared.ringing
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *), ringing == nil { ringing = AlarmKitBackend.shared.ringingAlarm() }
    #endif
    resolve(ringing?.toDictionary())
  }

  // MARK: - Queries

  @objc(getAlarm:resolve:reject:)
  func getAlarm(_ alarmId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(AlarmStore.get(alarmId)?.toDictionary())
  }

  @objc(getAllAlarms:reject:)
  func getAllAlarms(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(AlarmStore.all().sorted { $0.timestamp < $1.timestamp }.map { $0.toDictionary() })
  }

  @objc(isScheduled:resolve:reject:)
  func isScheduled(_ alarmId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let a = AlarmStore.get(alarmId)
    resolve(a != nil && a!.enabled && a!.nextTrigger() > 0)
  }
}
