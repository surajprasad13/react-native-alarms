package com.alarm

import android.content.Context

object AlarmStore {
  private fun prefs(ctx: Context) = ctx.getSharedPreferences("rn_alarms", Context.MODE_PRIVATE)

  fun save(ctx: Context, a: AlarmData) = prefs(ctx).edit().putString(a.id, a.toJson()).apply()
  fun get(ctx: Context, id: String) = prefs(ctx).getString(id, null)?.let { AlarmData.fromJson(it) }
  fun all(ctx: Context) = prefs(ctx).all.values.mapNotNull { (it as? String)?.let(AlarmData::fromJson) }
  fun remove(ctx: Context, id: String) = prefs(ctx).edit().remove(id).apply()
  fun clear(ctx: Context) = prefs(ctx).edit().clear().apply()
}