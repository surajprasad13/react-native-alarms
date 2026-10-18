import Foundation
import UserNotifications

/// Fallback backend for devices without AlarmKit (iOS < 26, or AlarmKit denied):
/// local notifications with Stop / Snooze actions.
///
/// Limitations compared with a real alarm: sound plays for at most ~30 s, the
/// silent switch and Focus modes are respected, and `interval` repeats are
/// pre-scheduled as a batch of exact one-off notifications (see `schedule`).
@objc(RNAlarmNotificationBackend)
final class NotificationBackend: NSObject, UNUserNotificationCenterDelegate {
  static let shared = NotificationBackend()

  static let category = "RN_ALARM"
  static let actionSnooze = "RN_ALARM_SNOOZE"
  static let actionStop = "RN_ALARM_STOP"
  private static let prefix = "rnalarm:"
  /// How many `interval` occurrences to pre-schedule (iOS caps pending requests at 64).
  private static let intervalOccurrences = 12

  private let center = UNUserNotificationCenter.current()

  /// The alarm whose notification is currently being shown (foreground) or was tapped.
  private(set) var ringing: AlarmData?
  /// Wired by `AlarmModule` so native events reach JS.
  var onEvent: ((String, AlarmData) -> Void)?

  /// Delegate that was installed before us (e.g. Notifee); non-alarm notifications go to it.
  private weak var previousDelegate: UNUserNotificationCenterDelegate?
  private static var installed = false

  /// Installs the delegate and actions. Call once at launch so a tap on a
  /// notification that starts the app is delivered to the module.
  @objc static func install() {
    let center = UNUserNotificationCenter.current()
    // Only once: a library that took over after us forwards to us, and taking the
    // delegate back would make the two forward to each other forever.
    if !installed {
      installed = true
      if center.delegate !== shared {
        shared.previousDelegate = center.delegate
        center.delegate = shared
      }
    }
    let snooze = UNNotificationAction(identifier: actionSnooze, title: "Snooze", options: [])
    let stop = UNNotificationAction(identifier: actionStop, title: "Stop", options: [.destructive])
    center.setNotificationCategories([
      UNNotificationCategory(
        identifier: category, actions: [snooze, stop], intentIdentifiers: [],
        options: [.customDismissAction]
      ),
    ])
  }

  // MARK: - Permission

  /// 'granted' | 'denied' | 'notDetermined', same vocabulary as Android.
  func status(_ completion: @escaping (String) -> Void) {
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral: completion("granted")
      case .denied: completion("denied")
      default: completion("notDetermined")
      }
    }
  }

  func request(_ completion: @escaping (Bool) -> Void) {
    center.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in completion(ok) }
  }

  // MARK: - Scheduling

  private func ids(for alarmId: String) -> [String] {
    let base = Self.prefix + alarmId
    return [base, base + ":snooze"]
      + (1...7).map { base + ":wd\($0)" }
      + (0..<Self.intervalOccurrences).map { base + ":i\($0)" }
  }

  private func content(for a: AlarmData) -> UNMutableNotificationContent {
    let c = UNMutableNotificationContent()
    c.title = a.title.isEmpty ? "Alarm" : a.title
    c.body = a.body.isEmpty ? "Alarm is ringing" : a.body
    c.categoryIdentifier = Self.category
    c.userInfo = ["alarmId": a.id]
    c.sound = (a.sound.isEmpty || a.sound == "default")
      ? .default
      : UNNotificationSound(named: UNNotificationSoundName(rawValue: a.sound))
    // Breaks through Focus when the Time Sensitive Notifications capability is enabled;
    // silently downgraded to a normal notification otherwise.
    c.interruptionLevel = .timeSensitive
    return c
  }

  private func request(_ id: String, _ a: AlarmData, _ trigger: UNNotificationTrigger) -> UNNotificationRequest {
    UNNotificationRequest(identifier: id, content: content(for: a), trigger: trigger)
  }

  func schedule(_ a: AlarmData, completion: @escaping (Error?) -> Void) {
    cancel(a.id)
    let cal = Calendar.current
    let base = Self.prefix + a.id
    let hm = cal.dateComponents([.hour, .minute], from: a.date)
    var requests: [UNNotificationRequest] = []

    switch a.repeatType {
    case "daily":
      var dc = DateComponents()
      dc.hour = hm.hour
      dc.minute = hm.minute
      requests.append(request(base, a, UNCalendarNotificationTrigger(dateMatching: dc, repeats: true)))

    case "weekly":
      let days = a.weekdays.isEmpty ? Array(1...7) : a.weekdays.filter { (1...7).contains($0) }
      for d in days {
        var dc = DateComponents()
        dc.weekday = d
        dc.hour = hm.hour
        dc.minute = hm.minute
        requests.append(request(base + ":wd\(d)", a, UNCalendarNotificationTrigger(dateMatching: dc, repeats: true)))
      }

    case "interval":
      // iOS repeating interval triggers count from "now", not from `timestamp`, so
      // pre-schedule the next N exact occurrences instead.
      var t = a.nextTrigger()
      guard t > 0 else { return completion(nil) }
      for k in 0..<Self.intervalOccurrences {
        requests.append(request(base + ":i\(k)", a, exactTrigger(ms: t)))
        t += a.intervalMs
      }

    default:
      let next = a.nextTrigger()
      guard next > 0 else { return completion(nil) } // nothing in the future, same as Android
      requests.append(request(base, a, exactTrigger(ms: next)))
    }

    add(requests, completion: completion)
  }

  private func exactTrigger(ms: Double) -> UNCalendarNotificationTrigger {
    let dc = Calendar.current.dateComponents(
      [.year, .month, .day, .hour, .minute, .second],
      from: Date(timeIntervalSince1970: ms / 1000)
    )
    return UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
  }

  private func add(_ requests: [UNNotificationRequest], completion: @escaping (Error?) -> Void) {
    let group = DispatchGroup()
    var firstError: Error?
    for r in requests {
      group.enter()
      center.add(r) { error in
        if firstError == nil { firstError = error }
        group.leave()
      }
    }
    group.notify(queue: .main) { completion(firstError) }
  }

  /// One-off re-ring in `minutes`, equivalent to Android's `AlarmScheduler.scheduleSnooze`.
  func snooze(_ a: AlarmData, minutes: Int) {
    center.removeDeliveredNotifications(withIdentifiers: ids(for: a.id))
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: Double(max(1, minutes)) * 60, repeats: false)
    center.add(request(Self.prefix + a.id + ":snooze", a, trigger))
    if ringing?.id == a.id { ringing = nil }
  }

  func cancel(_ id: String) {
    center.removePendingNotificationRequests(withIdentifiers: ids(for: id))
    center.removeDeliveredNotifications(withIdentifiers: ids(for: id))
    if ringing?.id == id { ringing = nil }
  }

  func cancelAll() {
    center.getPendingNotificationRequests { (requests: [UNNotificationRequest]) in
      let ours = requests.map { $0.identifier }.filter { $0.hasPrefix(Self.prefix) }
      self.center.removePendingNotificationRequests(withIdentifiers: ours)
    }
    center.getDeliveredNotifications { (notifications: [UNNotification]) in
      let ours = notifications.map { $0.request.identifier }.filter { $0.hasPrefix(Self.prefix) }
      self.center.removeDeliveredNotifications(withIdentifiers: ours)
    }
    ringing = nil
  }

  /// Dismiss: clear the shown notification and, like Android, drop a pending snooze.
  func stop(_ id: String) {
    center.removeDeliveredNotifications(withIdentifiers: ids(for: id))
    center.removePendingNotificationRequests(withIdentifiers: [Self.prefix + id + ":snooze"])
    if let a = ringing, a.id == id {
      ringing = nil
      onEvent?(AlarmModule.eventDismissed, a)
    }
  }

  // MARK: - UNUserNotificationCenterDelegate

  private func alarm(from notification: UNNotification) -> AlarmData? {
    guard let id = notification.request.content.userInfo["alarmId"] as? String else { return nil }
    return AlarmStore.get(id)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    guard let a = alarm(from: notification) else {
      if let previous = previousDelegate,
         previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:))) {
        previous.userNotificationCenter?(center, willPresent: notification, withCompletionHandler: completionHandler)
      } else {
        completionHandler([.banner, .list, .sound])
      }
      return
    }
    ringing = a
    onEvent?(AlarmModule.eventFired, a)
    // The ring screen takes over; keep the sound but skip the banner when it can show.
    completionHandler(onEvent == nil ? [.banner, .list, .sound] : [.list, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    guard let a = alarm(from: response.notification) else {
      if let previous = previousDelegate,
         previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:))) {
        previous.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
      } else {
        completionHandler()
      }
      return
    }
    defer { completionHandler() }
    switch response.actionIdentifier {
    case Self.actionSnooze:
      snooze(a, minutes: a.snoozeMinutes)
      onEvent?(AlarmModule.eventSnoozed, a)
    case UNNotificationDefaultActionIdentifier:
      // Tapped: the app is now open; let JS show its ring UI (getRingingAlarm / onAlarmFired).
      ringing = a
      onEvent?(AlarmModule.eventFired, a)
    default: // Stop action or swiped away
      ringing = nil
      center.removePendingNotificationRequests(withIdentifiers: [Self.prefix + a.id + ":snooze"])
      onEvent?(AlarmModule.eventDismissed, a)
    }
  }
}
