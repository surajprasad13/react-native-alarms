package com.alarm

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import java.lang.ref.WeakReference
import java.util.UUID

class AlarmModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

  init { instance = WeakReference(this) }

  override fun getName() = NAME

  override fun invalidate() {
    if (instance?.get() === this) instance = null
    super.invalidate()
  }

  // ---------- Permissions ----------

  private fun notificationsGranted(): Boolean =
    if (Build.VERSION.SDK_INT >= 33)
      ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
    else NotificationManagerCompat.from(ctx).areNotificationsEnabled()

  private fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(ctx)

  private fun canUseFullScreenIntent(): Boolean =
    Build.VERSION.SDK_INT < 34 ||
      ctx.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()

  private fun permissionMap(): WritableMap = Arguments.createMap().apply {
    val ok = notificationsGranted()
    putString("status", if (ok) "granted" else "denied")
    putBoolean("notifications", ok)
    putBoolean("canScheduleExact", AlarmScheduler.canScheduleExact(ctx))
    putBoolean("canDrawOverlays", canDrawOverlays())
    putBoolean("canUseFullScreenIntent", canUseFullScreenIntent())
  }

  private fun launchSettings(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    (ctx.currentActivity ?: ctx).startActivity(intent)
  }

  /**
   * Opens the settings screen for the first missing special permission, in the order
   * that matters most for a ringing alarm. Only one screen at a time; the caller
   * re-checks and calls again if needed.
   */
  private fun openNextMissingSpecialPermission(): Boolean {
    val pkg = Uri.parse("package:${ctx.packageName}")
    return when {
      // Android 12 only: on 13+ USE_EXACT_ALARM is granted automatically.
      Build.VERSION.SDK_INT in 31..32 && !AlarmScheduler.canScheduleExact(ctx) -> {
        launchSettings(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg)); true
      }
      // "Display over other apps": lets the ringing service pop the alarm screen
      // instantly, even from the background. The full-screen notification alone is
      // unreliable on many devices (notably Xiaomi/MIUI).
      !canDrawOverlays() -> {
        launchSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkg)); true
      }
      // Android 14+: full-screen intents can be revoked per app.
      !canUseFullScreenIntent() -> {
        launchSettings(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).setData(pkg)); true
      }
      else -> false
    }
  }

  /**
   * OEM "Autostart" permission (Xiaomi/MIUI, Oppo, Vivo, Huawei...). Without it the
   * system refuses to start the app's process to deliver the AlarmManager broadcast
   * once the app has been killed, so the alarm silently never rings. There is no public
   * API to query it; this opens the vendor settings screen when one exists.
   * Resolves true if a screen was opened, false if this device has none.
   */
  @ReactMethod
  fun openAutoStartSettings(promise: Promise) {
    val candidates = listOf(
      "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
      "com.samsung.android.lool" to "com.samsung.android.sm.ui.battery.BatteryActivity",
    )
    for ((pkg, cls) in candidates) {
      val intent = Intent().setComponent(android.content.ComponentName(pkg, cls))
      if (ctx.packageManager.resolveActivity(intent, 0) == null) continue
      try {
        launchSettings(intent)
        return promise.resolve(true)
      } catch (_: Exception) { /* try the next one */ }
    }
    promise.resolve(false)
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) =
    promise.resolve(AlarmScheduler.canScheduleExact(ctx))

  @ReactMethod
  fun checkPermission(promise: Promise) = promise.resolve(permissionMap())

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val activity = ctx.currentActivity
    if (Build.VERSION.SDK_INT >= 33 && !notificationsGranted() && activity is PermissionAwareActivity) {
      activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9871) { _, _, _ ->
        openNextMissingSpecialPermission()
        promise.resolve(permissionMap())
        true
      }
      return
    }
    openNextMissingSpecialPermission()
    promise.resolve(permissionMap())
  }

  // ---------- Scheduling ----------

  @ReactMethod
  fun scheduleAlarm(config: ReadableMap, promise: Promise) {
    try {
      val id = if (config.hasKey("alarmId") && !config.isNull("alarmId"))
        config.getString("alarmId")!! else UUID.randomUUID().toString()
      val alarm = AlarmData.fromMap(config, id)
      AlarmScheduler.cancel(ctx, id)
      AlarmStore.save(ctx, alarm)
      AlarmScheduler.schedule(ctx, alarm)
      promise.resolve(id)
    } catch (e: Exception) {
      promise.reject("E_SCHEDULE", e.message, e)
    }
  }

  @ReactMethod
  fun updateAlarm(alarmId: String, config: ReadableMap, promise: Promise) {
    try {
      if (AlarmStore.get(ctx, alarmId) == null) return promise.resolve(false)
      val alarm = AlarmData.fromMap(config, alarmId)
      AlarmScheduler.cancel(ctx, alarmId)
      AlarmStore.save(ctx, alarm)
      AlarmScheduler.schedule(ctx, alarm)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_UPDATE", e.message, e)
    }
  }

  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    val existed = AlarmStore.get(ctx, alarmId) != null
    AlarmScheduler.cancel(ctx, alarmId)
    if (AlarmService.current?.id == alarmId) AlarmService.dismiss(ctx)
    AlarmStore.remove(ctx, alarmId)
    promise.resolve(existed)
  }

  @ReactMethod
  fun cancelAllAlarms(promise: Promise) {
    AlarmStore.all(ctx).forEach { AlarmScheduler.cancel(ctx, it.id) }
    AlarmService.dismiss(ctx)
    AlarmStore.clear(ctx)
    promise.resolve(null)
  }

  // ---------- Control (while ringing) ----------

  @ReactMethod
  fun stopAlarm(alarmId: String, promise: Promise) {
    AlarmService.dismiss(ctx)
    promise.resolve(null)
  }

  @ReactMethod
  fun snoozeAlarm(alarmId: String, minutes: Double, promise: Promise) {
    val ringing = AlarmService.current
    if (ringing != null) {
      AlarmService.snooze(ctx, minutes.toInt())
      return promise.resolve(null)
    }
    // Not ringing: schedule a one-off snooze for a stored alarm.
    val alarm = AlarmStore.get(ctx, alarmId)
      ?: return promise.reject("E_NOT_FOUND", "Alarm $alarmId not found")
    try {
      AlarmScheduler.scheduleSnooze(ctx, alarm, minutes.toInt())
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SNOOZE", e.message, e)
    }
  }

  /** The alarm currently ringing (if any), so JS can show the ring UI on launch. */
  @ReactMethod
  fun getRingingAlarm(promise: Promise) =
    promise.resolve(AlarmService.current?.toWritableMap())

  // ---------- Queries ----------

  @ReactMethod
  fun getAlarm(alarmId: String, promise: Promise) =
    promise.resolve(AlarmStore.get(ctx, alarmId)?.toWritableMap())

  @ReactMethod
  fun getAllAlarms(promise: Promise) {
    val arr = Arguments.createArray()
    AlarmStore.all(ctx).sortedBy { it.timestamp }.forEach { arr.pushMap(it.toWritableMap()) }
    promise.resolve(arr)
  }

  @ReactMethod
  fun isScheduled(alarmId: String, promise: Promise) {
    val a = AlarmStore.get(ctx, alarmId)
    promise.resolve(a != null && a.enabled && a.nextTrigger() > 0)
  }

  // ---------- Events ----------

  // Required by NativeEventEmitter on the JS side.
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Double) {}

  private fun send(eventName: String, a: AlarmData) {
    if (!ctx.hasActiveReactInstance()) return
    val map = Arguments.createMap().apply {
      putString("alarmId", a.id)
      putDouble("timestamp", System.currentTimeMillis().toDouble())
      putString("title", a.title)
      putString("body", a.body)
      putString("data", a.data)
    }
    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(eventName, map)
  }

  companion object {
    const val NAME = "Alarm"
    const val EVENT_FIRED = "onAlarmFired"
    const val EVENT_DISMISSED = "onAlarmDismissed"
    const val EVENT_SNOOZED = "onAlarmSnoozed"

    private var instance: WeakReference<AlarmModule>? = null

    /** Called from native alarm code; no-op if the JS runtime isn't alive. */
    fun emit(eventName: String, a: AlarmData) {
      val module = instance?.get() ?: return
      runCatching { module.send(eventName, a) }
    }
  }
}
