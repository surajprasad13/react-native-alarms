/**
 * High-level alarm management API.
 *
 * Provides convenient wrapper methods for managing native alarms,
 * including scheduling, updating, cancelling, snoozing, and monitoring
 * alarm lifecycle events.
 *
 * This service can be used for alarms, scheduled reminders, and other
 * time-sensitive experiences supported by the native alarm module.
 *
 * @example
 * ```typescript
 * import { AlarmService } from 'react-native-alarms';
 *
 * const permission = await AlarmService.checkPermission();
 *
 * if (permission.status !== 'granted') {
 *   await AlarmService.requestPermission();
 * }
 *
 * const alarmId = await AlarmService.scheduleAlarm({
 *   timestamp: Date.now() + 60_000,
 *   title: 'Reminder',
 *   body: 'Your scheduled reminder is ready.',
 * });
 * ```
 */

import type {
  AlarmConfig,
  AlarmProp,
  AlarmPermission,
  AlarmEvent,
} from './src/types';

/**
 * Callback invoked when an alarm lifecycle event occurs.
 *
 * @param alarm - Information about the alarm associated with the event.
 */
type AlarmEventListener = (alarm: AlarmEvent) => void;

/**
 * Static service for managing native alarms.
 *
 * All methods can be called directly without creating an instance.
 */
export class AlarmService {
  /**
   * Initializes the alarm service and registers native event listeners.
   *
   * Call this method to begin forwarding native alarm events to
   * registered JavaScript listeners. Event registration methods may
   * also initialize the service automatically.
   */
  static initialize(): void;

  /**
   * Removes native event subscriptions created by the service.
   *
   * Registered JavaScript callbacks may remain registered, depending
   * on the implementation. Reinitialize the service before expecting
   * to receive native events again.
   */
  static cleanup(): void;

  /**
   * Registers a listener for when an alarm fires.
   *
   * @param listener - Callback invoked with the fired alarm's event data.
   * @returns A function that unregisters this listener.
   *
   * @example
   * ```typescript
   * const unsubscribe = AlarmService.onAlarmFired((alarm) => {
   *   console.log('Alarm fired:', alarm);
   * });
   *
   * // Unsubscribe when no longer needed.
   * unsubscribe();
   * ```
   */
  static onAlarmFired(listener: AlarmEventListener): () => void;

  /**
   * Registers a listener for when an alarm is dismissed.
   *
   * @param listener - Callback invoked with the dismissed alarm's event data.
   * @returns A function that unregisters this listener.
   */
  static onAlarmDismissed(listener: AlarmEventListener): () => void;

  /**
   * Registers a listener for when an alarm is snoozed.
   *
   * @param listener - Callback invoked with the snoozed alarm's event data.
   * @returns A function that unregisters this listener.
   */
  static onAlarmSnoozed(listener: AlarmEventListener): () => void;

  /**
   * Checks the current alarm permission status.
   *
   * @returns A promise resolving to the current permission information.
   * @throws If the native alarm module is unavailable.
   */
  static checkPermission(): Promise<AlarmPermission>;

  /**
   * Requests the permissions required by the native alarm functionality.
   *
   * @returns A promise resolving to the resulting permission information.
   * @throws If the native alarm module is unavailable.
   */
  static requestPermission(): Promise<AlarmPermission>;

  /**
   * Schedules a new alarm.
   *
   * @param config - Configuration describing the alarm to schedule.
   * @returns A promise resolving to the ID assigned to the scheduled alarm.
   * @throws If the native alarm module is unavailable or scheduling fails.
   */
  static scheduleAlarm(config: AlarmConfig): Promise<string>;

  /**
   * Updates an existing scheduled alarm.
   *
   * @param alarmId - ID of the alarm to update.
   * @param config - Updated configuration for the alarm.
   * @returns A promise resolving to `true` if the update succeeds.
   * @throws If the native alarm module is unavailable or the update fails.
   */
  static updateAlarm(alarmId: string, config: AlarmConfig): Promise<boolean>;

  /**
   * Cancels a scheduled alarm.
   *
   * @param alarmId - ID of the alarm to cancel.
   * @returns A promise resolving to `true` if the alarm was cancelled.
   * @throws If the native alarm module is unavailable.
   */
  static cancelAlarm(alarmId: string): Promise<boolean>;

  /**
   * Cancels all scheduled alarms.
   *
   * @returns A promise that resolves when the cancellation operation completes.
   * @throws If the native alarm module is unavailable.
   */
  static cancelAllAlarms(): Promise<void>;

  /**
   * Stops a currently ringing alarm.
   *
   * @param alarmId - ID of the ringing alarm to stop.
   * @returns A promise that resolves when the stop operation completes.
   * @throws If the native alarm module is unavailable.
   */
  static stopAlarm(alarmId: string): Promise<void>;

  /**
   * Snoozes a currently ringing alarm.
   *
   * @param alarmId - ID of the alarm to snooze.
   * @param minutes - Optional snooze duration in minutes. If omitted,
   * the native implementation or alarm configuration determines the default.
   * @returns A promise that resolves when the snooze operation completes.
   * @throws If the native alarm module is unavailable or snoozing fails.
   */
  static snoozeAlarm(alarmId: string, minutes?: number): Promise<void>;

  /**
   * Retrieves the currently ringing alarm, if one exists.
   *
   * @returns A promise resolving to the ringing alarm, or `null` if none exists.
   * @throws If the native alarm module is unavailable.
   */
  static getRingingAlarm(): Promise<AlarmProp | null>;

  /**
   * Retrieves a specific alarm by its ID.
   *
   * @param alarmId - ID of the alarm to retrieve.
   * @returns A promise resolving to the alarm, or `null` if it is not found.
   * @throws If the native alarm module is unavailable.
   */
  static getAlarm(alarmId: string): Promise<AlarmProp | null>;

  /**
   * Retrieves all alarms known to the native alarm module.
   *
   * @returns A promise resolving to an array of alarm records.
   * @throws If the native alarm module is unavailable.
   */
  static getAllAlarms(): Promise<AlarmProp[]>;

  /**
   * Checks whether an alarm is currently scheduled.
   *
   * @param alarmId - ID of the alarm to check.
   * @returns A promise resolving to `true` if the alarm is scheduled;
   * otherwise, `false`.
   * @throws If the native alarm module is unavailable.
   */
  static isScheduled(alarmId: string): Promise<boolean>;

  /**
   * Opens the device manufacturer's Auto Start settings on Android,
   * where supported, to help users configure background launch behavior.
   *
   * On iOS, this method resolves to `false`.
   *
   * @returns A promise resolving to `true` if the settings screen was opened;
   * otherwise, `false`.
   * @throws If the native alarm module is unavailable.
   */
  static openAutoStartSettings(): Promise<boolean>;
}

export default AlarmService;
