/**
 * High-level alarm management API.
 *
 * Provides a convenient wrapper around the native `Alarm` module for
 * scheduling and managing alarms, handling permissions, querying alarm
 * state, and subscribing to native alarm events.
 *
 * This API can also be used for time-sensitive reminders and custom
 * scheduled experiences supported by the native alarm presentation flow.
 *
 * @example
 * ```typescript
 * import { AlarmService } from 'react-native-alarms/service';
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
 *   body: 'Your scheduled event is ready.',
 * });
 * ```
 */
import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  AlarmConfig,
  AlarmProp,
  AlarmPermission,
  AlarmEvent,
} from './specs/NativeAlarm';

const { Alarm: NativeAlarm } = NativeModules;

/**
 * Resolves the native alarm module when it is linked.
 *
 * The module is loaded conditionally so importing the service does not
 * immediately fail when the native module is unavailable.
 */
const alarm = NativeAlarm ? require('./specs/NativeAlarm').default : null;

/**
 * Native event emitter used to subscribe to alarm lifecycle events.
 */
const alarmEmitter = NativeAlarm ? new NativeEventEmitter(NativeAlarm) : null;

/**
 * Callback invoked when a native alarm event is received.
 *
 * @param alarm Event data emitted by the native alarm module.
 */
type AlarmEventListener = (alarm: AlarmEvent) => void;

/**
 * High-level service for scheduling and managing native alarms.
 *
 * All methods are static, so the service can be used directly without
 * creating an instance.
 *
 * The service maintains JavaScript event listeners and forwards events
 * received from the native module to registered callbacks.
 *
 * @example
 * ```typescript
 * const unsubscribe = AlarmService.onAlarmFired((alarm) => {
 *   console.log('Alarm fired:', alarm.title);
 * });
 *
 * // Remove this listener when it is no longer needed.
 * unsubscribe();
 * ```
 */
export class AlarmService {
  /**
   * Registered JavaScript listeners grouped by event type.
   *
   * A `Set` prevents the same callback reference from being registered
   * more than once for the same event.
   */
  private static listeners: {
    fired: Set<AlarmEventListener>;
    dismissed: Set<AlarmEventListener>;
    snoozed: Set<AlarmEventListener>;
  } = {
    fired: new Set(),
    dismissed: new Set(),
    snoozed: new Set(),
  };

  /**
   * Native event subscriptions created by {@link initialize}.
   */
  private static subscriptions: any[] = [];

  /**
   * Initializes native event forwarding.
   *
   * Registers listeners for alarm firing, dismissal, and snoozing.
   * Calling this method when subscriptions already exist does not
   * register duplicate native subscriptions.
   *
   * This method is called automatically by the event subscription helpers.
   */
  static initialize(): void {
    if (!alarmEmitter || !this.subscriptions.length) {
      this.subscriptions = [
        alarmEmitter?.addListener('onAlarmFired', (data: any) => {
          this.listeners.fired.forEach(listener =>
            listener(data as AlarmEvent),
          );
        }),
        alarmEmitter?.addListener('onAlarmDismissed', (data: any) => {
          this.listeners.dismissed.forEach(listener =>
            listener(data as AlarmEvent),
          );
        }),
        alarmEmitter?.addListener('onAlarmSnoozed', (data: any) => {
          this.listeners.snoozed.forEach(listener =>
            listener(data as AlarmEvent),
          );
        }),
      ].filter(Boolean);
    }
  }

  /**
   * Removes native event subscriptions created by the service.
   *
   * This stops forwarding native events to JavaScript listeners until
   * {@link initialize} is called again.
   *
   * Registered JavaScript callbacks remain in their respective sets.
   * Use the unsubscribe functions returned by the event helpers to
   * remove individual callbacks.
   */
  static cleanup(): void {
    this.subscriptions.forEach(sub => sub?.remove());
    this.subscriptions = [];
  }

  /**
   * Subscribes to alarms when they fire.
   *
   * The service initializes native event forwarding automatically.
   *
   * @param listener Callback invoked with the fired alarm's event data.
   * @returns A function that unregisters this callback.
   *
   * @example
   * ```typescript
   * const unsubscribe = AlarmService.onAlarmFired(alarm => {
   *   console.log('Fired:', alarm.alarmId, alarm.title);
   * });
   *
   * // Later:
   * unsubscribe();
   * ```
   */
  static onAlarmFired(listener: AlarmEventListener): () => boolean {
    this.initialize();
    this.listeners.fired.add(listener);

    return () => this.listeners.fired.delete(listener);
  }

  /**
   * Subscribes to alarms when they are dismissed.
   *
   * @param listener Callback invoked with the dismissed alarm's event data.
   * @returns A function that unregisters this callback.
   */
  static onAlarmDismissed(listener: AlarmEventListener): () => boolean {
    this.initialize();
    this.listeners.dismissed.add(listener);

    return () => this.listeners.dismissed.delete(listener);
  }

  /**
   * Subscribes to alarms when they are snoozed.
   *
   * @param listener Callback invoked with the snoozed alarm's event data.
   * @returns A function that unregisters this callback.
   */
  static onAlarmSnoozed(listener: AlarmEventListener): () => boolean {
    this.initialize();
    this.listeners.snoozed.add(listener);

    return () => this.listeners.snoozed.delete(listener);
  }

  /**
   * Retrieves the current alarm permission and capability status.
   *
   * @returns A promise resolving to the current permission status.
   * @throws Error if the native alarm module is not linked.
   */
  static async checkPermission(): Promise<AlarmPermission> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.checkPermission();
  }

  /**
   * Requests the permissions required for alarm scheduling.
   *
   * The permissions requested depend on the platform and its capabilities.
   *
   * @returns A promise resolving to the updated permission status.
   * @throws Error if the native alarm module is not linked.
   */
  static async requestPermission(): Promise<AlarmPermission> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.requestPermission();
  }

  /**
   * Schedules a new alarm or time-based reminder.
   *
   * @param config Configuration containing the trigger timestamp,
   * title, optional message, repeat settings, and custom data.
   * @returns A promise resolving to the scheduled alarm ID.
   * @throws Error if the native alarm module is not linked.
   *
   * @example
   * ```typescript
   * const alarmId = await AlarmService.scheduleAlarm({
   *   timestamp: Date.now() + 5 * 60_000,
   *   title: 'Take a break',
   *   body: 'Your scheduled break starts now.',
   *   data: JSON.stringify({ type: 'break-reminder' }),
   * });
   * ```
   */
  static async scheduleAlarm(config: AlarmConfig): Promise<string> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.scheduleAlarm(config);
  }

  /**
   * Updates an existing scheduled alarm.
   *
   * @param alarmId Identifier of the alarm to update.
   * @param config Updated alarm configuration.
   * @returns A promise resolving to `true` if the update succeeds.
   * @throws Error if the native alarm module is not linked.
   */
  static async updateAlarm(
    alarmId: string,
    config: AlarmConfig,
  ): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.updateAlarm(alarmId, config);
  }

  /**
   * Cancels a specific scheduled alarm.
   *
   * @param alarmId Identifier of the alarm to cancel.
   * @returns A promise resolving to whether cancellation succeeded.
   * @throws Error if the native alarm module is not linked.
   */
  static async cancelAlarm(alarmId: string): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.cancelAlarm(alarmId);
  }

  /**
   * Cancels all scheduled alarms managed by the native module.
   *
   * @returns A promise that resolves when the operation completes.
   * @throws Error if the native alarm module is not linked.
   */
  static async cancelAllAlarms(): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.cancelAllAlarms();
  }

  /**
   * Stops a currently ringing alarm.
   *
   * @param alarmId Identifier of the ringing alarm.
   * @returns A promise that resolves when the operation completes.
   * @throws Error if the native alarm module is not linked.
   */
  static async stopAlarm(alarmId: string): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.stopAlarm(alarmId);
  }

  /**
   * Snoozes a currently ringing alarm.
   *
   * @param alarmId Identifier of the ringing alarm.
   * @param minutes Snooze duration in minutes. Defaults to `5`.
   * @returns A promise that resolves when the operation completes.
   * @throws Error if the native alarm module is not linked.
   *
   * @example
   * ```typescript
   * await AlarmService.snoozeAlarm(alarmId, 10);
   * ```
   */
  static async snoozeAlarm(alarmId: string, minutes?: number): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.snoozeAlarm(alarmId, minutes ?? 5);
  }

  /**
   * Retrieves the alarm that is currently ringing.
   *
   * @returns A promise resolving to the ringing alarm, or `null`
   * if no alarm is currently ringing.
   * @throws Error if the native alarm module is not linked.
   */
  static async getRingingAlarm(): Promise<AlarmProp | null> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getRingingAlarm();
  }

  /**
   * Retrieves a scheduled alarm by its identifier.
   *
   * @param alarmId Identifier of the alarm to retrieve.
   * @returns A promise resolving to the alarm, or `null` if not found.
   * @throws Error if the native alarm module is not linked.
   */
  static async getAlarm(alarmId: string): Promise<AlarmProp | null> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getAlarm(alarmId);
  }

  /**
   * Retrieves all alarms managed by the native module.
   *
   * @returns A promise resolving to the list of scheduled alarms.
   * @throws Error if the native alarm module is not linked.
   */
  static async getAllAlarms(): Promise<AlarmProp[]> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getAllAlarms();
  }

  /**
   * Checks whether an alarm is currently scheduled.
   *
   * @param alarmId Identifier of the alarm to check.
   * @returns A promise resolving to `true` if scheduled, otherwise `false`.
   * @throws Error if the native alarm module is not linked.
   */
  static async isScheduled(alarmId: string): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.isScheduled(alarmId);
  }

  /**
   * Opens the device manufacturer's Auto Start settings screen.
   *
   * This is primarily intended for Android devices whose manufacturers
   * provide additional background-execution settings.
   *
   * On iOS, the native implementation resolves to `false`.
   *
   * @returns A promise resolving to `true` if the settings screen was
   * opened, or `false` if unsupported or unavailable.
   * @throws Error if the native alarm module is not linked.
   */
  static async openAutoStartSettings(): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.openAutoStartSettings();
  }
}

/**
 * Default export for convenient service access.
 *
 * @example
 * ```typescript
 * import AlarmService from 'react-native-alarms/service';
 *
 * const alarms = await AlarmService.getAllAlarms();
 * ```
 */
export default AlarmService;
