export interface AlarmPresentation {
  /**
   * Registered presentation type, such as "alarm" or "reminder".
   */
  type?: string;

  /**
   * Optional props supplied to the selected React Native screen.
   */
  props?: Record<string, unknown>;
}

/**
 * Shared contract for the native `Alarm` module.
 *
 * This module provides cross-platform native scheduling for React Native.
 * While it can be used as a traditional alarm clock, it is also designed for
 * exact-time reminders, scheduled wake-up flows, recurring tasks, and
 * custom full-screen React Native experiences.
 *
 * Native module name: `Alarm`
 *
 * Events emitted through `NativeEventEmitter`:
 * - `onAlarmFired`
 * - `onAlarmDismissed`
 * - `onAlarmSnoozed`
 */

/**
 * Repeat configuration for a scheduled alarm.
 */
export type AlarmRepeat = {
  /**
   * Repeat strategy.
   *
   * - `none` – Fires once.
   * - `daily` – Repeats every day.
   * - `weekly` – Repeats on selected weekdays.
   * - `interval` – Repeats after a fixed interval.
   */
  type: 'none' | 'daily' | 'weekly' | 'interval';

  /**
   * Weekdays used when `type` is `weekly`.
   *
   * Values:
   * - `1` = Sunday
   * - `2` = Monday
   * - `3` = Tuesday
   * - `4` = Wednesday
   * - `5` = Thursday
   * - `6` = Friday
   * - `7` = Saturday
   */
  weekdays?: number[];

  /**
   * Repeat interval in milliseconds.
   *
   * Used only when `type` is `interval`.
   */
  intervalMs?: number;
};

/**
 * Configuration used when scheduling or updating an alarm.
 */
export type AlarmConfig = {
  /**
   * Optional unique identifier.
   *
   * If omitted, the native module generates one automatically.
   */
  alarmId?: string;

  /**
   * Trigger time in Unix milliseconds.
   *
   * Example:
   * `Date.now() + 60000`
   */
  timestamp: number;

  /**
   * Title displayed when the alarm fires.
   */
  title: string;

  /**
   * Optional body or description.
   */
  body?: string;

  /**
   * Optional image URI (for example, a `file://` path or an `https://` URL).
   * Passed to the ringing screen and shown in native notifications when supported.
   */
  image?: string;

  /**
   * Alarm sound file name, such as `"bell.wav"`.
   *
   * Bundle the same filename with the iOS app and place it in Android's
   * `android/app/src/main/res/raw` directory. Uses the system default if
   * omitted, set to `"default"`, or the file is unavailable.
   */
  sound?: string;

  /**
   * Enables vibration.
   *
   * Android only.
   * iOS vibration follows system behavior.
   */
  vibrate?: boolean;

  /**
   * Whether snoozing is allowed.
   */
  snoozeEnabled?: boolean;

  /**
   * Snooze duration in minutes.
   */
  snoozeMinutes?: number;

  /**
   * Repeat configuration.
   */
  repeat?: AlarmRepeat;

  /**
   * Optional JSON string passed back when the alarm fires.
   *
   * Useful for:
   * - task IDs
   * - appointment IDs
   * - navigation targets
   * - custom UI data
   */
  data?: string;

  /** Screen selection and custom props for the ringing experience. */
  presentation?: AlarmPresentation;
};

/**
 * Alarm object returned from native queries.
 */
export type AlarmProp = {
  /** Unique alarm identifier. */
  alarmId: string;

  /** Scheduled trigger timestamp. */
  timestamp: number;

  /** Alarm title. */
  title: string;

  /** Alarm body. */
  body: string;

  /** Optional image URI. */
  image?: string;

  /** Sound being used. */
  sound: string;

  /** Whether vibration is enabled. */
  vibrate: boolean;

  /** Whether snooze is enabled. */
  snoozeEnabled: boolean;

  /** Snooze duration in minutes. */
  snoozeMinutes: number;

  /** Repeat configuration. */
  repeat: AlarmRepeat;

  /** Custom payload. */
  data: string;

  /** Whether the alarm is currently enabled. */
  enabled: boolean;

  /**
   * Next scheduled trigger.
   *
   * `0` means no future trigger exists.
   */
  nextTriggerAt: number;
};

/**
 * Permission status returned by the native module.
 */
export type AlarmPermission = {
  /**
   * Overall permission state.
   */
  status: 'granted' | 'denied' | 'notDetermined';

  /** Notification permission. */
  notifications: boolean;

  /**
   * Whether exact scheduling is available.
   *
   * Primarily relevant on Android.
   */
  canScheduleExact: boolean;

  /**
   * Overlay permission.
   *
   * Android only.
   * Always `true` on iOS.
   */
  canDrawOverlays: boolean;

  /**
   * Full-screen intent capability.
   *
   * Android only.
   * Always `true` on iOS.
   */
  canUseFullScreenIntent: boolean;

  /**
   * iOS backend currently in use.
   *
   * - `alarmkit`
   * - `notifications`
   */
  backend?: 'alarmkit' | 'notifications';
};

/**
 * Event payload emitted through `NativeEventEmitter`.
 */
export type AlarmEvent = {
  /** Alarm identifier. */
  alarmId: string;

  /** Original trigger timestamp. */
  timestamp: number;

  /** Alarm title. */
  title: string;

  /** Alarm body. */
  body: string;

  /** Optional image URI. */
  image?: string;

  /** Custom JSON payload. */
  data: string;
};

export type AlarmEventMap = {
  onAlarmFired: AlarmEvent;
  onAlarmDismissed: AlarmEvent;
  onAlarmSnoozed: AlarmEvent;
};

export type AlarmEventName = keyof AlarmEventMap;
