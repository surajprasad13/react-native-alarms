package com.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground service that actually rings: looping sound, vibration, a partial wake
 * lock and a full-screen notification that pops [AlarmRingActivity] over the lock
 * screen. Same architecture as Upupup's AlarmService.
 *
 * Why a service and not just a notification from the receiver: a BroadcastReceiver
 * only gets ~10s of execution and the process can be killed right after. A
 * foreground service keeps the process alive (JS runtime included once started),
 * keeps the sound looping and is what lets a killed app ring reliably.
 */
class AlarmService : Service() {

  private val handler = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_SNOOZE -> {
        snooze(intent.getIntExtra(EXTRA_SNOOZE_MINUTES, -1))
        return START_NOT_STICKY
      }
      ACTION_DISMISS -> {
        dismiss()
        return START_NOT_STICKY
      }
    }

    val id = intent?.getStringExtra(AlarmScheduler.EXTRA_ID)
    val alarm = id?.let { AlarmStore.get(this, it) }
    if (alarm == null) {
      Log.w(TAG, "Started without a known alarm (id=$id); stopping")
      // Must still enter the foreground briefly: we were started with
      // startForegroundService() and the system expects startForeground().
      runCatching { startInForeground(placeholderNotification()) }
      stopSelf()
      return START_NOT_STICKY
    }
    if (current != null) stopRinging() // a second alarm fired while one was ringing

    current = alarm
    Log.i(TAG, "Ringing alarm ${alarm.id}")

    startInForeground(buildNotification(alarm))
    acquireWakeLock()
    startSound(alarm)
    if (alarm.vibrate) startVibration()

    // The full-screen intent only fires when the screen is off/locked and on some
    // OEMs (Xiaomi, Oppo, Vivo...) it is unreliable even then. Launching the ring
    // activity directly works whenever the app has "display over other apps"
    // (SYSTEM_ALERT_WINDOW) or one of our activities is visible; the system
    // silently ignores it otherwise, so it is safe to always try.
    runCatching {
      startActivity(
        Intent(this, AlarmRingActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }.onFailure { Log.w(TAG, "Could not start ring activity directly", it) }

    AlarmModule.emit(AlarmModule.EVENT_FIRED, alarm)

    // Safety net: never ring forever. Auto-snooze (or stop) after 5 minutes.
    handler.postDelayed({ if (alarm.snoozeEnabled) snooze(-1) else dismiss() }, AUTO_TIMEOUT_MS)
    return START_NOT_STICKY
  }

  private fun startInForeground(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceCompat.startForeground(
        this, NOTIFICATION_ID, notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun snooze(minutes: Int) {
    val alarm = current ?: run { stopSelf(); return }
    val mins = if (minutes > 0) minutes else alarm.snoozeMinutes
    runCatching { AlarmScheduler.scheduleSnooze(this, alarm, mins) }
      .onFailure { Log.e(TAG, "Could not schedule snooze", it) }
    AlarmModule.emit(AlarmModule.EVENT_SNOOZED, alarm)
    stopRinging()
    stopSelf()
  }

  private fun dismiss() {
    val alarm = current ?: run { stopSelf(); return }
    // A dismissed snoozed alarm must not ring again from its snooze intent.
    AlarmScheduler.cancelSnooze(this, alarm.id)
    AlarmModule.emit(AlarmModule.EVENT_DISMISSED, alarm)
    stopRinging()
    stopSelf()
  }

  private fun stopRinging() {
    handler.removeCallbacksAndMessages(null)
    runCatching { player?.stop() }
    runCatching { player?.release() }
    player = null
    vibrator?.cancel()
    vibrator = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    current = null
    AlarmRingActivity.finishIfOpen()
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
  }

  override fun onDestroy() {
    stopRinging()
    super.onDestroy()
  }

  // ---- Sound ----

  private fun startSound(alarm: AlarmData) {
    val uri = alarm.sound.takeIf { it.isNotBlank() && it != "default" }?.let { Uri.parse(it) }
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

    try {
      val mp = MediaPlayer()
      player = mp
      mp.apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        setDataSource(this@AlarmService, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not play $uri, vibrating only", e)
      runCatching { player?.release() }
      player = null
      startVibration() // last resort: at least wake the user somehow
    }
  }

  // ---- Vibration ----

  @Suppress("DEPRECATION")
  private fun startVibration() {
    if (vibrator != null) return
    val v = getSystemService(Vibrator::class.java) ?: return
    vibrator = v
    val pattern = longArrayOf(0, 800, 400, 800, 800)
    v.vibrate(
      VibrationEffect.createWaveform(pattern, 0),
      AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
    )
  }

  // ---- Plumbing ----

  private fun acquireWakeLock() {
    val pm = getSystemService(PowerManager::class.java)
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "rnalarm:ring").apply {
      acquire(AUTO_TIMEOUT_MS + 60_000)
    }
  }

  private fun ensureChannel(): NotificationManager {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
          setSound(null, null) // the service plays its own sound
          enableVibration(false)
          setBypassDnd(true)
        }
      )
    }
    return manager
  }

  private fun placeholderNotification(): Notification {
    ensureChannel()
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Alarm")
      .build()
  }

  private fun buildNotification(alarm: AlarmData): Notification {
    ensureChannel()
    val ringIntent = Intent(this, AlarmRingActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val fullScreen = PendingIntent.getActivity(
      this, 1, ringIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val b = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(alarm.title.ifBlank { "Alarm" })
      .setContentText(alarm.body.ifBlank { "Alarm is ringing" })
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreen, true)
      .setContentIntent(fullScreen)
      .addAction(0, "Stop", commandPI(ACTION_DISMISS, 2))
    if (alarm.snoozeEnabled) {
      b.addAction(0, "Snooze", commandPI(ACTION_SNOOZE, 3))
    }
    return b.build()
  }

  private fun commandPI(action: String, code: Int): PendingIntent =
    PendingIntent.getService(
      this, code, Intent(this, AlarmService::class.java).setAction(action),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

  companion object {
    private const val TAG = "AlarmService"
    private const val CHANNEL_ID = "rn_alarm_channel"
    private const val NOTIFICATION_ID = 1
    private const val AUTO_TIMEOUT_MS = 5L * 60 * 1000

    const val ACTION_SNOOZE = "com.alarm.service.SNOOZE"
    const val ACTION_DISMISS = "com.alarm.service.DISMISS"
    const val EXTRA_SNOOZE_MINUTES = "snoozeMinutes"

    /** The alarm currently ringing, readable by [AlarmRingActivity] and [AlarmModule]. */
    @Volatile
    var current: AlarmData? = null
      private set

    fun start(context: Context, alarmId: String) {
      androidx.core.content.ContextCompat.startForegroundService(
        context,
        Intent(context, AlarmService::class.java).putExtra(AlarmScheduler.EXTRA_ID, alarmId)
      )
    }

    fun snooze(context: Context, minutes: Int = -1) =
      command(context, Intent(context, AlarmService::class.java)
        .setAction(ACTION_SNOOZE).putExtra(EXTRA_SNOOZE_MINUTES, minutes))

    fun dismiss(context: Context) =
      command(context, Intent(context, AlarmService::class.java).setAction(ACTION_DISMISS))

    private fun command(context: Context, intent: Intent) {
      if (current == null) return // nothing ringing; avoid starting a service for nothing
      runCatching { context.startService(intent) }
        .onFailure { Log.w(TAG, "Could not send ${intent.action}", it) }
    }
  }
}
