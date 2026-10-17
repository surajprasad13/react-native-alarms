package com.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * AlarmManager fires here at the exact trigger time. The receiver only gets ~10s of
 * guaranteed execution, so it updates the store and hands off to [AlarmService]
 * immediately. The service does the actual ringing, screen wake and UI.
 */
class AlarmReceiver : BroadcastReceiver() {
  companion object {
    private const val TAG = "AlarmReceiver"
    const val ACTION_FIRE = "com.alarm.FIRE"
  }

  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != ACTION_FIRE) return
    val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
    val alarm = AlarmStore.get(ctx, id)
    if (alarm == null) {
      Log.w(TAG, "Alarm $id fired but is no longer stored")
      return
    }
    Log.i(TAG, "Alarm $id fired (snooze=${intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZE, false)})")

    if (!intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZE, false)) {
      if (alarm.repeatType == "none") {
        alarm.enabled = false
        AlarmStore.save(ctx, alarm)
      } else {
        // Repeating: arm the next occurrence right away so it is guaranteed even
        // if the user force-stops the ringing screen.
        runCatching { AlarmScheduler.schedule(ctx, alarm) }
          .onFailure { Log.e(TAG, "Could not re-arm repeating alarm $id", it) }
      }
    }

    AlarmService.start(ctx, id)
  }
}
