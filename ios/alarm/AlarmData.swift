import Foundation

/// iOS mirror of the Android `AlarmData` model: same fields, same JS shape
/// (`toDictionary()` == Android `toWritableMap()`), same `nextTrigger` rules.
struct AlarmData: Codable {
  var id: String
  var timestamp: Double // ms since epoch
  var title: String
  var body: String
  var image: String? = nil
  var sound: String
  var vibrate: Bool
  var snoozeEnabled: Bool
  var snoozeMinutes: Int
  var repeatType: String // none | daily | weekly | interval
  var weekdays: [Int] // 1 = Sunday ... 7 = Saturday
  var intervalMs: Double
  var data: String
  var enabled: Bool = true
  var componentName: String = "AlarmRing"
  var componentPropsJSON: String = "{}"
  
  static func now() -> Double { Date().timeIntervalSince1970 * 1000 }
  
  var date: Date { Date(timeIntervalSince1970: timestamp / 1000) }

   var componentProps: [String: Any] {
        guard
            let jsonData = componentPropsJSON.data(using: .utf8),
            let object = try? JSONSerialization.jsonObject(with: jsonData),
            let props = object as? [String: Any]
        else {
            return [:]
        }

        return props
    }

  var bundledSoundName: String? {
    guard !sound.isEmpty, sound != "default",
          URL(fileURLWithPath: sound).lastPathComponent == sound else {
      return nil
    }

    let filename = URL(fileURLWithPath: sound)
    let name = filename.deletingPathExtension().lastPathComponent
    let fileExtension = filename.pathExtension
    guard !name.isEmpty, !fileExtension.isEmpty,
          Bundle.main.url(forResource: name, withExtension: fileExtension) != nil else {
      return nil
    }

    return sound
  }
  
  /// Next time this alarm should ring, in ms since epoch, or 0 if never.
  func nextTrigger(from: Double = AlarmData.now()) -> Double {
    if !enabled { return 0 }
    switch repeatType {
    case "daily":
      return nextMatching(from: from) { _ in true }
    case "weekly":
      return nextMatching(from: from) { weekdays.isEmpty || weekdays.contains($0) }
    case "interval":
      if intervalMs <= 0 { return 0 }
      if timestamp > from { return timestamp }
      return timestamp + (floor((from - timestamp) / intervalMs) + 1) * intervalMs
    default:
      return timestamp > from ? timestamp : 0
    }
  }
  
  private func nextMatching(from: Double, ok: (Int) -> Bool) -> Double {
    let cal = Calendar.current
    let base = cal.dateComponents([.hour, .minute], from: date)
    var day = Date(timeIntervalSince1970: from / 1000)
    for _ in 0..<8 {
      var comps = cal.dateComponents([.year, .month, .day], from: day)
      comps.hour = base.hour
      comps.minute = base.minute
      comps.second = 0
      if let candidate = cal.date(from: comps) {
        let ms = candidate.timeIntervalSince1970 * 1000
        if ms > from && ok(cal.component(.weekday, from: candidate)) { return ms }
      }
      day = cal.date(byAdding: .day, value: 1, to: day) ?? day
    }
    return 0
  }
  
  // MARK: - JS bridge shape (same keys as Android)
  
  func toDictionary() -> [String: Any] {
    [
      "alarmId": id,
      "timestamp": timestamp,
      "title": title,
      "body": body,
      "image": image ?? "",
      "sound": sound,
      "vibrate": vibrate,
      "snoozeEnabled": snoozeEnabled,
      "snoozeMinutes": snoozeMinutes,
      "repeat": ["type": repeatType, "weekdays": weekdays, "intervalMs": intervalMs],
      "data": data,
      "enabled": enabled,
      "nextTriggerAt": nextTrigger(),
    ]
  }
  
  /// Parses the `AlarmConfig` object JS passes to `scheduleAlarm` / `updateAlarm`.
  static func from(config m: [String: Any], id: String) -> AlarmData {
    let r = m["repeat"] as? [String: Any]
    return AlarmData(
      id: id,
      timestamp: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0,
      title: m["title"] as? String ?? "",
      body: m["body"] as? String ?? "",
      image: m["image"] as? String,
      sound: m["sound"] as? String ?? "default",
      vibrate: (m["vibrate"] as? NSNumber)?.boolValue ?? true,
      snoozeEnabled: (m["snoozeEnabled"] as? NSNumber)?.boolValue ?? true,
      snoozeMinutes: (m["snoozeMinutes"] as? NSNumber)?.intValue ?? 5,
      repeatType: r?["type"] as? String ?? "none",
      weekdays: (r?["weekdays"] as? [NSNumber])?.map { $0.intValue } ?? [],
      intervalMs: (r?["intervalMs"] as? NSNumber)?.doubleValue ?? 0,
      data: m["data"] as? String ?? "",
      enabled: true
    )
  }
}
