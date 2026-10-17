import Foundation

/// UserDefaults-backed persistence, the iOS counterpart of Android's `AlarmStore`.
enum AlarmStore {
  private static let key = "RNAlarm.alarms"
  private static let lock = NSLock()

  static func all() -> [AlarmData] {
    lock.lock(); defer { lock.unlock() }
    return Array(load().values)
  }

  static func get(_ id: String) -> AlarmData? {
    lock.lock(); defer { lock.unlock() }
    return load()[id]
  }

  static func save(_ alarm: AlarmData) {
    lock.lock(); defer { lock.unlock() }
    var map = load()
    map[alarm.id] = alarm
    persist(map)
  }

  static func remove(_ id: String) {
    lock.lock(); defer { lock.unlock() }
    var map = load()
    map.removeValue(forKey: id)
    persist(map)
  }

  static func clear() {
    lock.lock(); defer { lock.unlock() }
    persist([:])
  }

  // MARK: - Private

  private static func load() -> [String: AlarmData] {
    guard let data = UserDefaults.standard.data(forKey: key),
          let map = try? JSONDecoder().decode([String: AlarmData].self, from: data)
    else { return [:] }
    return map
  }

  private static func persist(_ map: [String: AlarmData]) {
    if let data = try? JSONEncoder().encode(map) {
      UserDefaults.standard.set(data, forKey: key)
    }
  }
}
