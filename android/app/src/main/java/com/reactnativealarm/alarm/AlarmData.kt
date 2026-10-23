package com.alarm

import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
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
  var enabled: Boolean = true,
  val componentName: String = "AlarmRing",
  val componentPropsJSON: String = "{}"
) {
  val componentProps: Map<String, Any>
    get() {
      return try {
        val obj = JSONObject(componentPropsJSON)
        val map = mutableMapOf<String, Any>()
        val keys = obj.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          val value = obj.get(key)
          if (value != JSONObject.NULL) {
            map[key] = value
          }
        }
        map
      } catch (_: Exception) {
        emptyMap()
      }
    }

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
    put("componentName", componentName)
    put("componentPropsJSON", componentPropsJSON)
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
    putString("componentName", componentName)
    putString("componentPropsJSON", componentPropsJSON)
    try {
      putMap("componentProps", jsonToWritableMap(JSONObject(componentPropsJSON)))
    } catch (_: Exception) {
      putMap("componentProps", Arguments.createMap())
    }
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
    putString("componentName", componentName)
    putString("componentPropsJSON", componentPropsJSON)
    try {
      val propsObj = JSONObject(componentPropsJSON)
      val propsBundle = jsonToBundle(propsObj)
      putBundle("componentProps", propsBundle)
      for (key in propsBundle.keySet()) {
        if (!containsKey(key)) {
          val v = propsBundle.get(key)
          when (v) {
            is String -> putString(key, v)
            is Boolean -> putBoolean(key, v)
            is Int -> putInt(key, v)
            is Long -> putLong(key, v)
            is Double -> putDouble(key, v)
            is Bundle -> putBundle(key, v)
          }
        }
      }
    } catch (_: Exception) {}
  }

  private fun jsonToBundle(jsonObject: JSONObject): Bundle {
    val bundle = Bundle()
    val iter = jsonObject.keys()
    while (iter.hasNext()) {
      val key = iter.next()
      when (val value = jsonObject.opt(key)) {
        is JSONObject -> bundle.putBundle(key, jsonToBundle(value))
        is JSONArray -> bundle.putString(key, value.toString())
        is Boolean -> bundle.putBoolean(key, value)
        is Int -> bundle.putInt(key, value)
        is Long -> bundle.putLong(key, value)
        is Double -> bundle.putDouble(key, value)
        is String -> bundle.putString(key, value)
        else -> if (value != null && value != JSONObject.NULL) {
          bundle.putString(key, value.toString())
        }
      }
    }
    return bundle
  }

  companion object {
    fun fromJson(s: String): AlarmData {
      val o = JSONObject(s)
      val wd = o.optJSONArray("weekdays")
      val compName = o.optString("componentName", "AlarmRing").trim()
      return AlarmData(
        id = o.getString("id"),
        timestamp = o.getLong("timestamp"),
        title = o.optString("title"),
        body = o.optString("body"),
        sound = o.optString("sound", "default"),
        vibrate = o.optBoolean("vibrate", true),
        snoozeEnabled = o.optBoolean("snoozeEnabled", true),
        snoozeMinutes = o.optInt("snoozeMinutes", 5),
        repeatType = o.optString("repeatType", "none"),
        weekdays = if (wd == null) emptyList() else (0 until wd.length()).map { wd.getInt(it) },
        intervalMs = o.optLong("intervalMs", 0),
        data = o.optString("data"),
        enabled = o.optBoolean("enabled", true),
        componentName = if (compName.isEmpty()) "AlarmRing" else compName,
        componentPropsJSON = o.optString("componentPropsJSON", "{}").ifBlank { "{}" }
      )
    }

    fun fromMap(m: ReadableMap, id: String): AlarmData {
      val r = if (m.hasKey("repeat") && !m.isNull("repeat")) m.getMap("repeat") else null
      val wd = r?.takeIf { it.hasKey("weekdays") }?.getArray("weekdays")
        ?.let { a -> (0 until a.size()).map { a.getInt(it) } } ?: emptyList()

      val componentPropsStr = when {
        m.hasKey("componentPropsJSON") && !m.isNull("componentPropsJSON") ->
          m.getString("componentPropsJSON") ?: "{}"
        m.hasKey("componentProps") && !m.isNull("componentProps") -> {
          val propsMap = m.getMap("componentProps")
          try {
            val hashMap = propsMap?.toHashMap() ?: emptyMap<String, Any>()
            JSONObject(hashMap).toString()
          } catch (_: Exception) {
            "{}"
          }
        }
        else -> "{}"
      }

      val compName = m.str("componentName", "AlarmRing").trim()

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
        data = m.str("data"),
        componentName = if (compName.isEmpty()) "AlarmRing" else compName,
        componentPropsJSON = componentPropsStr
      )
    }

    private fun jsonToWritableMap(jsonObject: JSONObject): WritableMap {
      val map = Arguments.createMap()
      val iter = jsonObject.keys()
      while (iter.hasNext()) {
        val key = iter.next()
        when (val value = jsonObject.opt(key)) {
          is JSONObject -> map.putMap(key, jsonToWritableMap(value))
          is JSONArray -> map.putArray(key, jsonToWritableArray(value))
          is Boolean -> map.putBoolean(key, value)
          is Int -> map.putInt(key, value)
          is Long -> map.putDouble(key, value.toDouble())
          is Double -> map.putDouble(key, value)
          is String -> map.putString(key, value)
          else -> if (value == null || value == JSONObject.NULL) {
            map.putNull(key)
          } else {
            map.putString(key, value.toString())
          }
        }
      }
      return map
    }

    private fun jsonToWritableArray(jsonArray: JSONArray): WritableArray {
      val array = Arguments.createArray()
      for (i in 0 until jsonArray.length()) {
        when (val value = jsonArray.opt(i)) {
          is JSONObject -> array.pushMap(jsonToWritableMap(value))
          is JSONArray -> array.pushArray(jsonToWritableArray(value))
          is Boolean -> array.pushBoolean(value)
          is Int -> array.pushInt(value)
          is Long -> array.pushDouble(value.toDouble())
          is Double -> array.pushDouble(value)
          is String -> array.pushString(value)
          else -> if (value == null || value == JSONObject.NULL) {
            array.pushNull()
          } else {
            array.pushString(value.toString())
          }
        }
      }
      return array
    }

    private fun ReadableMap.str(k: String, d: String = "") =
      if (hasKey(k) && !isNull(k)) getString(k) ?: d else d

    private fun ReadableMap.bool(k: String, d: Boolean) =
      if (hasKey(k) && !isNull(k)) getBoolean(k) else d
  }
}