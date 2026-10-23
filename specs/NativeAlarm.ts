import type { TurboModule } from 'react-native';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

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
   * Alarm sound.
   *
   * Use `"default"` or a bundled sound file name.
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

  /** Custom JSON payload. */
  data: string;
};

/**
 * Native Alarm module interface.
 */
export interface Spec extends TurboModule {
  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  /**
   * Returns the current permission status.
   */
  checkPermission(): Promise<AlarmPermission>;

  /**
   * Requests any required permissions.
   */
  requestPermission(): Promise<AlarmPermission>;

  /**
   * Checks whether exact alarms can be scheduled.
   *
   * Android only.
   */
  canScheduleExactAlarms(): Promise<boolean>;

  /**
   * Opens the device's Autostart settings screen.
   *
   * Android:
   * Opens the vendor-specific Autostart page when available.
   *
   * iOS:
   * Resolves `false`.
   */
  openAutoStartSettings(): Promise<boolean>;

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------

  /**
   * Schedules a new alarm.
   *
   * Returns the generated or provided alarm ID.
   */
  scheduleAlarm(config: AlarmConfig): Promise<string>;

  /**
   * Updates an existing alarm.
   *
   * Returns `true` if the update succeeds.
   */
  updateAlarm(alarmId: string, config: AlarmConfig): Promise<boolean>;

  /**
   * Cancels a specific alarm.
   */
  cancelAlarm(alarmId: string): Promise<boolean>;

  /**
   * Cancels every scheduled alarm.
   */
  cancelAllAlarms(): Promise<void>;

  // ---------------------------------------------------------------------------
  // Ringing Controls
  // ---------------------------------------------------------------------------

  /**
   * Stops the currently ringing alarm.
   */
  stopAlarm(alarmId: string): Promise<void>;

  /**
   * Snoozes the currently ringing alarm.
   *
   * @param alarmId Alarm identifier.
   * @param minutes Snooze duration in minutes.
   */
  snoozeAlarm(alarmId: string, minutes: number): Promise<void>;

  /**
   * Returns the currently ringing alarm, if one exists.
   */
  getRingingAlarm(): Promise<AlarmProp | null>;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Returns a scheduled alarm by ID.
   */
  getAlarm(alarmId: string): Promise<AlarmProp | null>;

  /**
   * Returns every scheduled alarm.
   */
  getAllAlarms(): Promise<AlarmProp[]>;

  /**
   * Checks whether an alarm is scheduled.
   */
  isScheduled(alarmId: string): Promise<boolean>;

  // ---------------------------------------------------------------------------
  // NativeEventEmitter Support
  // ---------------------------------------------------------------------------

  /**
   * Internal listener registration.
   */
  addListener(eventName: string): void;

  /**
   * Internal listener cleanup.
   */
  removeListeners(count: number): void;
}

/**
 * Error shown when the native module is unavailable.
 */
const LINKING_ERROR =
  "react-native-alarms: the native 'Alarm' module is not linked. " +
  Platform.select({
    ios: "Run 'pod install' in the ios folder, then rebuild the app.",
    default: 'Rebuild the app after installing the package.',
  });

/**
 * Cross-platform native Alarm module.
 *
 * Supports both the legacy Native Module system and the New Architecture
 * (TurboModules). The module is resolved lazily so importing it does not
 * immediately throw if native linking is missing.
 *
 * @example
 * ```ts
 * import Alarm from 'react-native-alarms';
 *
 * const id = await Alarm.scheduleAlarm({
 *   timestamp: Date.now() + 60000,
 *   title: 'Meeting',
 *   body: 'Standup starts now',
 * });
 * ```
 */
const Alarm: Spec =
  TurboModuleRegistry.get<Spec>('Alarm') ??
  NativeModules.Alarm ??
  new Proxy({} as Spec, {
    get() {
      throw new Error(LINKING_ERROR);
    },
  });

export default Alarm;
