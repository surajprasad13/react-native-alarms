import type { TurboModule } from 'react-native';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { AlarmPermission, AlarmConfig, AlarmProp } from '../src/types';

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
    default:
      'Rebuild the app after installing the package. Expo Go is unsupported; use a development build.',
  });

export function getNativeAlarmModule(): Spec | null {
  return TurboModuleRegistry.get<Spec>('Alarm') ?? NativeModules.Alarm ?? null;
}

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
  getNativeAlarmModule() ??
  new Proxy({} as Spec, {
    get() {
      throw new Error(LINKING_ERROR);
    },
  });

export default Alarm;
