package com.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * AlarmManager registrations do not survive a reboot (or an app update, or a clock
 * change that could make a computed trigger wrong). This receiver re-arms them all.
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> {
        Log.i(TAG, "Re-arming alarms after ${intent.action}")
        AlarmScheduler.scheduleAll(context)
      }
    }
  }

  companion object {
    private const val TAG = "BootReceiver"
  }
}
