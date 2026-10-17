package com.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Registers alarms with [AlarmManager.setAlarmClock]: exact trigger, exempt from Doze
 * and battery optimisations, and the system shows the alarm-clock status-bar icon.
 */
object AlarmScheduler {
  private const val TAG = "AlarmScheduler"
  const val EXTRA_ID = "alarmId"
  const val EXTRA_SNOOZE = "snooze"

  private fun am(ctx: Context) = ctx.getSystemService(AlarmManager::class.java)

  fun canScheduleExact(ctx: Context) =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am(ctx).canScheduleExactAlarms()

  /** Re-syncs every enabled alarm with AlarmManager. Idempotent. */
  fun scheduleAll(ctx: Context) {
    AlarmStore.all(ctx).forEach { a ->
      if (a.enabled) runCatching { schedule(ctx, a) }
        .onFailure { Log.e(TAG, "Could not re-arm ${a.id}", it) }
      else cancel(ctx, a.id)
    }
  }

  fun schedule(ctx: Context, a: AlarmData) {
    val at = a.nextTrigger()
    if (at > 0) setExact(ctx, at, firePI(ctx, a.id, false))
    else Log.i(TAG, "Alarm ${a.id} has no future trigger; not scheduled")
  }

  fun scheduleSnooze(ctx: Context, a: AlarmData, minutes: Int) =
    setExact(ctx, System.currentTimeMillis() + minutes * 60_000L, firePI(ctx, a.id, true))

  fun cancel(ctx: Context, id: String) {
    am(ctx).cancel(firePI(ctx, id, false))
    cancelSnooze(ctx, id)
  }

  fun cancelSnooze(ctx: Context, id: String) {
    am(ctx).cancel(firePI(ctx, id, true))
  }

  private fun setExact(ctx: Context, at: Long, pi: PendingIntent) {
    if (!canScheduleExact(ctx)) {
      throw SecurityException("Exact alarm permission (SCHEDULE_EXACT_ALARM) not granted")
    }
    // Tapping the status-bar alarm icon opens the app.
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val show = launch?.let {
      PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    am(ctx).setAlarmClock(AlarmManager.AlarmClockInfo(at, show), pi)
    Log.i(TAG, "Alarm set for ${java.util.Date(at)}")
  }

  private fun firePI(ctx: Context, id: String, snooze: Boolean): PendingIntent {
    val i = Intent(ctx, AlarmReceiver::class.java)
      .setAction(AlarmReceiver.ACTION_FIRE)
      .putExtra(EXTRA_ID, id)
      .putExtra(EXTRA_SNOOZE, snooze)
    return PendingIntent.getBroadcast(
      ctx, (id + if (snooze) "_s" else "").hashCode(), i,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
