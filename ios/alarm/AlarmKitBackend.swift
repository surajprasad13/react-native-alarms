import CryptoKit
import Foundation
import SwiftUI

#if canImport(AlarmKit)
import ActivityKit
import AlarmKit
import AppIntents

/// Metadata type required by `AlarmAttributes`; extend it if you add a Live Activity widget.
@available(iOS 26.0, *)
struct RNAlarmMetadata: AlarmMetadata {}

/// Backs the "Open" button on the AlarmKit alert. An AlarmKit alert ignores taps on
/// its body, so this intent (run in the app process, `openAppWhenRun`) is the only
/// way the alert can open the app and show the React ring screen.
@available(iOS 26.0, *)
struct OpenAlarmAppIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Open Alarm"
  static let description = IntentDescription("Opens the ringing alarm's screen")
  static let openAppWhenRun: Bool = true
  static let isDiscoverable: Bool = false
  
  @Parameter(title: "alarmID")
  var alarmID: String
  
  init() {}
  init(alarmID: String) { self.alarmID = alarmID }
  
  func perform() async throws -> some IntentResult {
    AlarmKitBackend.shared.openFromAlert(alarmID)
    return .result()
  }
}

/// Real alarms on iOS 26+: ring through silent mode and Focus with the system alarm UI.
/// Only compiled with an SDK that ships AlarmKit (Xcode 26+); older toolchains build
/// the app with the notification fallback only.
@available(iOS 26.0, *)
final class AlarmKitBackend {
  static let shared = AlarmKitBackend()
  
  private let manager = AlarmManager.shared
  /// Wired by `AlarmModule` so native events reach JS.
  var onEvent: ((String, AlarmData) -> Void)?
  
  private var observer: Task<Void, Never>?
  private var lastStates: [UUID: Alarm.State] = [:]
  /// Alarms we are stopping as part of a programmatic snooze (so the observer
  /// reports "snoozed" instead of "dismissed").
  private var snoozing: Set<UUID> = []
  /// Alarms stopped only to silence the system sound while the in-app ring screen
  /// (with its own TTS) is showing. The ring session stays alive until JS calls
  /// stop/snooze, so the observer must not report these as dismissed.
  private var silenced: [UUID: AlarmData] = [:]
  
  private static let allWeekdays: [Locale.Weekday] = [
    .sunday, .monday, .tuesday, .wednesday, .thursday, .friday, .saturday,
  ]
  
  // MARK: - Authorization
  
  var isAuthorized: Bool { manager.authorizationState == .authorized }
  
  /// 'granted' | 'denied' | 'notDetermined', same vocabulary as Android.
  var status: String {
    switch manager.authorizationState {
    case .authorized: return "granted"
    case .denied: return "denied"
    default: return "notDetermined"
    }
  }
  
  func requestAuthorization() async -> Bool {
    (try? await manager.requestAuthorization()) == .authorized
  }
  
  // MARK: - Ids
  
  /// Android ids are free-form strings; AlarmKit wants UUIDs. Real UUIDs pass through,
  /// anything else is hashed deterministically so cancel/stop can find it again.
  static func uuid(for id: String, snooze: Bool = false) -> UUID {
    let key = snooze ? id + "_s" : id
    if !snooze, let u = UUID(uuidString: key) { return u }
    let bytes = Array(SHA256.hash(data: Data(key.utf8)).prefix(16))
    return bytes.withUnsafeBufferPointer { NSUUID(uuidBytes: $0.baseAddress!) as UUID }
  }
  
  private func stored(for uuid: UUID) -> AlarmData? {
    AlarmStore.all().first {
      Self.uuid(for: $0.id) == uuid || Self.uuid(for: $0.id, snooze: true) == uuid
    }
  }
  
  // MARK: - Scheduling
  
  func schedule(_ a: AlarmData) async throws {
    cancel(a.id)
    let next = a.nextTrigger()
    guard next > 0 else { return } // nothing in the future; Android skips too
    
    let hm = Calendar.current.dateComponents([.hour, .minute], from: a.date)
    let time = Alarm.Schedule.Relative.Time(hour: hm.hour ?? 0, minute: hm.minute ?? 0)
    let schedule: Alarm.Schedule
    switch a.repeatType {
    case "daily":
      schedule = .relative(.init(time: time, repeats: .weekly(Self.allWeekdays)))
    case "weekly":
      let days = a.weekdays.isEmpty
      ? Self.allWeekdays
      : a.weekdays.filter { (1...7).contains($0) }.map { Self.allWeekdays[$0 - 1] }
      schedule = .relative(.init(time: time, repeats: .weekly(days)))
    default:
      // none: one exact ring. interval: one exact ring, re-armed by the observer
      // after it is dismissed (only while the app process is alive).
      schedule = .fixed(Date(timeIntervalSince1970: next / 1000))
    }
    
    _ = try await manager.schedule(id: Self.uuid(for: a.id), configuration: configuration(for: a, schedule: schedule))
    startObserving()
  }
  
  private func configuration(for a: AlarmData, schedule: Alarm.Schedule)
  -> AlarmManager.AlarmConfiguration<RNAlarmMetadata>
  {
    let title = LocalizedStringResource(stringLiteral: a.title.isEmpty ? "Alarm" : a.title)
    let stop = AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.fill")
    // The alert's body ignores taps and it allows a single secondary button, so it
    // must be "Open" (via OpenAlarmAppIntent): the React ring screen it opens has
    // its own Snooze/Finish. The system countdown-snooze button is dropped for it.
    let open = AlarmButton(text: "Open", textColor: .white, systemImageName: "arrow.up.forward.app")
    let alert = AlarmPresentation.Alert(
      title: title, stopButton: stop, secondaryButton: open, secondaryButtonBehavior: .custom
    )
    
    let attributes = AlarmAttributes<RNAlarmMetadata>(
      presentation: AlarmPresentation(alert: alert),
      metadata: RNAlarmMetadata(),
      tintColor: .blue
    )
    let sound: AlertConfiguration.AlertSound =
    (a.sound.isEmpty || a.sound == "default") ? .default : .named(a.sound)
    
    return AlarmManager.AlarmConfiguration(
      schedule: schedule,
      attributes: attributes,
      secondaryIntent: OpenAlarmAppIntent(alarmID: a.id),
      sound: sound
    )
  }
  
  func cancel(_ id: String) {
    for uuid in [Self.uuid(for: id), Self.uuid(for: id, snooze: true)] {
      try? manager.cancel(id: uuid)
      silenced.removeValue(forKey: uuid)
    }
  }
  
  func cancelAll() {
    for alarm in (try? manager.alarms) ?? [] { try? manager.cancel(id: alarm.id) }
  }
  
  func stop(_ id: String) {
    for uuid in [Self.uuid(for: id), Self.uuid(for: id, snooze: true)] {
      try? manager.stop(id: uuid)
      // Ended a session we had silenced earlier: the observer saw nothing change,
      // so report the dismissal (and re-arm intervals) here instead.
      if let a = silenced.removeValue(forKey: uuid) {
        onEvent?(AlarmModule.eventDismissed, a)
        if a.repeatType == "interval" { Task { try? await self.schedule(a) } }
      }
    }
  }
  
  /// "Open" tapped on the system alert (OpenAlarmAppIntent). The tap stops the
  /// AlarmKit alarm, so adopt the session as `silenced` — still ringing as far as
  /// JS is concerned — and show the React ring screen once the app is frontmost.
  func openFromAlert(_ id: String) {
    guard let a = AlarmStore.get(id) else { return }
    let current = (try? manager.alarms) ?? []
    for uuid in [Self.uuid(for: a.id), Self.uuid(for: a.id, snooze: true)]
          where current.contains(where: { $0.id == uuid && $0.state == .alerting }) {
      silenced[uuid] = a
      try? manager.stop(id: uuid)
    }
    // The system may have stopped it before we ran; the session is still ours.
    if !silenced.values.contains(where: { $0.id == a.id }) {
      silenced[Self.uuid(for: a.id)] = a
    }
    DispatchQueue.main.async { AlarmRingPresenter.present(a, bridge: nil) }
  }
  
  /// Stops the system alert's sound/UI while the in-app ring screen takes over.
  /// The session stays "ringing" (see `silenced`) until JS stops or snoozes it.
  func silence(_ id: String) {
    let current = (try? manager.alarms) ?? []
    for uuid in [Self.uuid(for: id), Self.uuid(for: id, snooze: true)]
          where current.contains(where: { $0.id == uuid && $0.state == .alerting }) {
      silenced[uuid] = stored(for: uuid)
      try? manager.stop(id: uuid)
    }
  }
  
  /// Silences the ringing alarm (if any) and re-rings once in `minutes`,
  /// equivalent to Android's `AlarmScheduler.scheduleSnooze`.
  func snooze(_ a: AlarmData, minutes: Int) async throws {
    let current = (try? manager.alarms) ?? []
    var wasSilenced = false
    for uuid in [Self.uuid(for: a.id), Self.uuid(for: a.id, snooze: true)] {
      if silenced.removeValue(forKey: uuid) != nil { wasSilenced = true }
      if current.contains(where: { $0.id == uuid && $0.state == .alerting }) {
        snoozing.insert(uuid)
        try? manager.stop(id: uuid)
      }
    }
    // Snoozed a session we had silenced: the observer saw nothing change, report it here.
    if wasSilenced { onEvent?(AlarmModule.eventSnoozed, a) }
    let date = Date().addingTimeInterval(Double(max(1, minutes)) * 60)
    _ = try await manager.schedule(
      id: Self.uuid(for: a.id, snooze: true),
      configuration: configuration(for: a, schedule: .fixed(date))
    )
    startObserving()
  }
  
  func ringingAlarm() -> AlarmData? {
    if let alerting = ((try? manager.alarms) ?? []).first(where: { $0.state == .alerting }) {
      return stored(for: alerting.id)
    }
    // Sound silenced for the in-app ring screen, but the session is still live.
    return silenced.values.first
  }
  
  // MARK: - Events
  
  /// Translates AlarmKit state changes into the Android-style events.
  func startObserving() {
    guard observer == nil else { return }
    for alarm in (try? manager.alarms) ?? [] { lastStates[alarm.id] = alarm.state }
    observer = Task { [weak self] in
      for await alarms in AlarmManager.shared.alarmUpdates {
        self?.handle(alarms)
      }
    }
  }
  
  private func handle(_ alarms: [Alarm]) {
    var states: [UUID: Alarm.State] = [:]
    for alarm in alarms { states[alarm.id] = alarm.state }
    
    for (uuid, state) in states where lastStates[uuid] != state {
      guard let a = stored(for: uuid) else { continue }
      if state == .alerting {
        silenced.removeValue(forKey: uuid) // ringing again supersedes any old silence
        onEvent?(AlarmModule.eventFired, a)
      } else if lastStates[uuid] == .alerting {
        if silenced[uuid] != nil { continue } // silenced for the ring screen, not over yet
        onEvent?(state == .countdown ? AlarmModule.eventSnoozed : AlarmModule.eventDismissed, a)
      }
    }
    
    // One-off (`.fixed`) alarms disappear once stopped.
    for (uuid, previous) in lastStates where states[uuid] == nil && previous == .alerting {
      if silenced[uuid] != nil { continue } // silenced for the ring screen, not over yet
      guard let a = stored(for: uuid) else { continue }
      if snoozing.remove(uuid) != nil {
        onEvent?(AlarmModule.eventSnoozed, a)
      } else {
        onEvent?(AlarmModule.eventDismissed, a)
        if a.repeatType == "interval" {
          Task { try? await self.schedule(a) }
        }
      }
    }
    
    lastStates = states
  }
}
#endif
