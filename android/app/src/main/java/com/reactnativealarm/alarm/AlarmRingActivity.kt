package com.alarm

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.lang.ref.WeakReference

/**
 * Full-screen ringing UI shown over the lock screen (or on top of the app when it is
 * open). Hosts the React component registered as [COMPONENT_NAME] and passes the
 * ringing alarm as its initial props. Mirrors Upupup's RingActivity.
 */
class AlarmRingActivity : ReactActivity() {

  override fun getMainComponentName(): String = COMPONENT_NAME

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
      override fun getLaunchOptions(): Bundle? = AlarmService.current?.toBundle()
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Stale launch (alarm already stopped): don't even spin up the React root.
    if (AlarmService.current == null) {
      super.onCreate(null)
      finish()
      return
    }
    instance = WeakReference(this)
    super.onCreate(savedInstanceState)
    showOverLockScreen()
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  /** The only ways out are Stop and Snooze: swallow the back button. */
  override fun invokeDefaultOnBackPressed() { /* consume */ }

  override fun onDestroy() {
    if (instance?.get() === this) instance = null
    super.onDestroy()
  }

  companion object {
    const val COMPONENT_NAME = "AlarmRing"

    private var instance: WeakReference<AlarmRingActivity>? = null

    val isOpen: Boolean get() = instance?.get() != null

    /** Called by [AlarmService] when ringing ends for any reason. */
    fun finishIfOpen() {
      instance?.get()?.finish()
    }

    /**
     * Brings the ring screen up when an alarm is ringing and the user opens the app
     * (the full-screen intent only fires when the screen is off/locked).
     */
    fun openIfRinging(activity: Activity) {
      if (AlarmService.current != null && !isOpen) {
        activity.startActivity(
          Intent(activity, AlarmRingActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }
  }
}
