/**
 * AlarmService - High-level alarm management API
 * Provides convenient wrapper methods for the native alarm module
 */

import type {
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
} from './specs/NativeAlarm';

type AlarmEventListener = (alarm: AlarmEvent) => void;

/**
 * High-level alarm service for managing alarms
 */
export class AlarmService {
  /**
   * Initialize the alarm service and set up event listeners
   */
  static initialize(): void;

  /**
   * Cleanup event listeners
   */
  static cleanup(): void;

  /**
   * Register a listener for when alarms fire
   * @returns unsubscribe function
   */
  static onAlarmFired(listener: AlarmEventListener): () => void;

  /**
   * Register a listener for when alarms are dismissed
   * @returns unsubscribe function
   */
  static onAlarmDismissed(listener: AlarmEventListener): () => void;

  /**
   * Register a listener for when alarms are snoozed
   * @returns unsubscribe function
   */
  static onAlarmSnoozed(listener: AlarmEventListener): () => void;

  /**
   * Check the current alarm permissions
   */
  static checkPermission(): Promise<AlarmPermission>;

  /**
   * Request alarm permissions
   */
  static requestPermission(): Promise<AlarmPermission>;

  /**
   * Schedule a new alarm
   * @returns alarm ID
   */
  static scheduleAlarm(config: AlarmConfig): Promise<string>;

  /**
   * Update an existing alarm
   * @returns boolean indicating success
   */
  static updateAlarm(alarmId: string, config: AlarmConfig): Promise<boolean>;

  /**
   * Cancel an alarm
   * @returns boolean if alarm existed
   */
  static cancelAlarm(alarmId: string): Promise<boolean>;

  /**
   * Cancel all alarms
   */
  static cancelAllAlarms(): Promise<void>;

  /**
   * Stop the currently ringing alarm
   */
  static stopAlarm(alarmId: string): Promise<void>;

  /**
   * Snooze the currently ringing alarm
   * @param minutes - snooze duration (defaults to alarm's snoozeMinutes)
   */
  static snoozeAlarm(alarmId: string, minutes?: number): Promise<void>;

  /**
   * Get the currently ringing alarm (if any)
   */
  static getRingingAlarm(): Promise<Alarm | null>;

  /**
   * Get a specific alarm by ID
   */
  static getAlarm(alarmId: string): Promise<Alarm | null>;

  /**
   * Get all scheduled alarms
   */
  static getAllAlarms(): Promise<Alarm[]>;

  /**
   * Check if an alarm is scheduled
   */
  static isScheduled(alarmId: string): Promise<boolean>;

  /**
   * Opens the vendor Autostart screen on Android; resolves false on iOS.
   */
  static openAutoStartSettings(): Promise<boolean>;
}

export default AlarmService;
