package com.alarm

import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class AlarmData(
  val id: String,
  val timestamp: Long,
  val title: String,
  val body: String,
  val sound: String,
  val vibrate: Boolean,
  val snoozeEnabled: Boolean,
  val snoozeMinutes: Int,
  val repeatType: String,
  val weekdays: List<Int>,
  val intervalMs: Long,
  val data: String,
  var enabled: Boolean = true
) {
  fun nextTrigger(from: Long = System.currentTimeMillis()): Long {
    if (!enabled) return 0
    return when (repeatType) {
      "daily" -> nextMatching(from) { true }
      "weekly" -> nextMatching(from) { weekdays.isEmpty() || it in weekdays }
      "interval" -> when {
        intervalMs <= 0 -> 0
        timestamp > from -> timestamp
        else -> timestamp + ((from - timestamp) / intervalMs + 1) * intervalMs
      }
      else -> if (timestamp > from) timestamp else 0
    }
  }

  private fun nextMatching(from: Long, ok: (Int) -> Boolean): Long {
    val base = Calendar.getInstance().apply { timeInMillis = timestamp }
    val c = Calendar.getInstance().apply {
      timeInMillis = from
      set(Calendar.HOUR_OF_DAY, base.get(Calendar.HOUR_OF_DAY))
      set(Calendar.MINUTE, base.get(Calendar.MINUTE))
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    repeat(8) {
      if (c.timeInMillis > from && ok(c.get(Calendar.DAY_OF_WEEK))) return c.timeInMillis
      c.add(Calendar.DAY_OF_YEAR, 1)
    }
    return 0
  }

  fun toJson(): String = JSONObject().apply {
    put("id", id); put("timestamp", timestamp); put("title", title); put("body", body)
    put("sound", sound); put("vibrate", vibrate); put("snoozeEnabled", snoozeEnabled)
    put("snoozeMinutes", snoozeMinutes); put("repeatType", repeatType)
    put("weekdays", JSONArray(weekdays)); put("intervalMs", intervalMs)
    put("data", data); put("enabled", enabled)
  }.toString()

  fun toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("alarmId", id)
    putDouble("timestamp", timestamp.toDouble())
    putString("title", title)
    putString("body", body)
    putString("sound", sound)
    putBoolean("vibrate", vibrate)
    putBoolean("snoozeEnabled", snoozeEnabled)
    putDouble("snoozeMinutes", snoozeMinutes.toDouble())
    putMap("repeat", Arguments.createMap().apply {
      putString("type", repeatType)
      putArray("weekdays", Arguments.createArray().apply { weekdays.forEach { pushInt(it) } })
      putDouble("intervalMs", intervalMs.toDouble())
    })
    putString("data", data)
    putBoolean("enabled", enabled)
    putDouble("nextTriggerAt", nextTrigger().toDouble())
  }

  /** Initial props for the React ring screen hosted by [AlarmRingActivity]. */
  fun toBundle(): Bundle = Bundle().apply {
    putString("alarmId", id)
    putDouble("timestamp", timestamp.toDouble())
    putString("title", title)
    putString("body", body)
    putBoolean("snoozeEnabled", snoozeEnabled)
    putInt("snoozeMinutes", snoozeMinutes)
    putString("data", data)
  }

  companion object {
    fun fromJson(s: String): AlarmData {
      val o = JSONObject(s)
      val wd = o.optJSONArray("weekdays")
      return AlarmData(
        o.getString("id"), o.getLong("timestamp"), o.optString("title"), o.optString("body"),
        o.optString("sound", "default"), o.optBoolean("vibrate", true),
        o.optBoolean("snoozeEnabled", true), o.optInt("snoozeMinutes", 5),
        o.optString("repeatType", "none"),
        if (wd == null) emptyList() else (0 until wd.length()).map { wd.getInt(it) },
        o.optLong("intervalMs", 0), o.optString("data"), o.optBoolean("enabled", true)
      )
    }

    fun fromMap(m: ReadableMap, id: String): AlarmData {
      val r = if (m.hasKey("repeat") && !m.isNull("repeat")) m.getMap("repeat") else null
      val wd = r?.takeIf { it.hasKey("weekdays") }?.getArray("weekdays")
        ?.let { a -> (0 until a.size()).map { a.getInt(it) } } ?: emptyList()
      return AlarmData(
        id = id,
        timestamp = m.getDouble("timestamp").toLong(),
        title = m.str("title"),
        body = m.str("body"),
        sound = m.str("sound", "default"),
        vibrate = m.bool("vibrate", true),
        snoozeEnabled = m.bool("snoozeEnabled", true),
        snoozeMinutes = if (m.hasKey("snoozeMinutes")) m.getDouble("snoozeMinutes").toInt() else 5,
        repeatType = r?.str("type", "none") ?: "none",
        weekdays = wd,
        intervalMs = if (r != null && r.hasKey("intervalMs")) r.getDouble("intervalMs").toLong() else 0,
        data = m.str("data")
      )
    }

    private fun ReadableMap.str(k: String, d: String = "") =
      if (hasKey(k) && !isNull(k)) getString(k) ?: d else d

    private fun ReadableMap.bool(k: String, d: Boolean) =
      if (hasKey(k) && !isNull(k)) getBoolean(k) else d
  }
}