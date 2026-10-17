/**
 * AlarmService - High-level alarm management API
 *
 * This module provides a convenient wrapper around the native alarm module
 * with additional features like event listeners and state management.
 */

import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
} from './specs/NativeAlarm';

const { Alarm: NativeAlarm } = NativeModules;

// Guard against module not being linked
const alarm = NativeAlarm ? require('./specs/NativeAlarm').default : null;

const alarmEmitter = NativeAlarm ? new NativeEventEmitter(NativeAlarm) : null;

type AlarmEventListener = (alarm: AlarmEvent) => void;

/**
 * High-level alarm service for managing alarms
 */
export class AlarmService {
  private static listeners: {
    fired: Set<AlarmEventListener>;
    dismissed: Set<AlarmEventListener>;
    snoozed: Set<AlarmEventListener>;
  } = {
    fired: new Set(),
    dismissed: new Set(),
    snoozed: new Set(),
  };

  private static subscriptions: any[] = [];

  /**
   * Initialize the alarm service and set up event listeners
   */
  static initialize() {
    if (!alarmEmitter || !this.subscriptions.length) {
      this.subscriptions = [
        alarmEmitter?.addListener('onAlarmFired', (data: any) => {
          this.listeners.fired.forEach(listener => listener(data as AlarmEvent));
        }),
        alarmEmitter?.addListener('onAlarmDismissed', (data: any) => {
          this.listeners.dismissed.forEach(listener => listener(data as AlarmEvent));
        }),
        alarmEmitter?.addListener('onAlarmSnoozed', (data: any) => {
          this.listeners.snoozed.forEach(listener => listener(data as AlarmEvent));
        }),
      ].filter(Boolean);
    }
  }

  /**
   * Cleanup event listeners
   */
  static cleanup() {
    this.subscriptions.forEach(sub => sub?.remove());
    this.subscriptions = [];
  }

  /**
   * Register a listener for when alarms fire
   */
  static onAlarmFired(listener: AlarmEventListener) {
    this.initialize();
    this.listeners.fired.add(listener);
    return () => this.listeners.fired.delete(listener);
  }

  /**
   * Register a listener for when alarms are dismissed
   */
  static onAlarmDismissed(listener: AlarmEventListener) {
    this.initialize();
    this.listeners.dismissed.add(listener);
    return () => this.listeners.dismissed.delete(listener);
  }

  /**
   * Register a listener for when alarms are snoozed
   */
  static onAlarmSnoozed(listener: AlarmEventListener) {
    this.initialize();
    this.listeners.snoozed.add(listener);
    return () => this.listeners.snoozed.delete(listener);
  }

  /**
   * Check the current alarm permissions
   */
  static async checkPermission(): Promise<AlarmPermission> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.checkPermission();
  }

  /**
   * Request alarm permissions
   */
  static async requestPermission(): Promise<AlarmPermission> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.requestPermission();
  }

  /**
   * Schedule a new alarm
   */
  static async scheduleAlarm(config: AlarmConfig): Promise<string> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.scheduleAlarm(config);
  }

  /**
   * Update an existing alarm
   */
  static async updateAlarm(
    alarmId: string,
    config: AlarmConfig,
  ): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.updateAlarm(alarmId, config);
  }

  /**
   * Cancel an alarm
   */
  static async cancelAlarm(alarmId: string): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.cancelAlarm(alarmId);
  }

  /**
   * Cancel all alarms
   */
  static async cancelAllAlarms(): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.cancelAllAlarms();
  }

  /**
   * Stop the currently ringing alarm
   */
  static async stopAlarm(alarmId: string): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.stopAlarm(alarmId);
  }

  /**
   * Snooze the currently ringing alarm
   */
  static async snoozeAlarm(alarmId: string, minutes?: number): Promise<void> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.snoozeAlarm(alarmId, minutes ?? 5);
  }

  /**
   * Get the currently ringing alarm (if any)
   */
  static async getRingingAlarm(): Promise<Alarm | null> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getRingingAlarm();
  }

  /**
   * Get a specific alarm by ID
   */
  static async getAlarm(alarmId: string): Promise<Alarm | null> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getAlarm(alarmId);
  }

  /**
   * Get all scheduled alarms
   */
  static async getAllAlarms(): Promise<Alarm[]> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.getAllAlarms();
  }

  /**
   * Check if an alarm is scheduled
   */
  static async isScheduled(alarmId: string): Promise<boolean> {
    if (!alarm) throw new Error('Alarm module not linked');
    return alarm.isScheduled(alarmId);
  }
}

// Export a singleton instance
export default AlarmService;
