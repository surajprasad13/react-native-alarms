import type { TurboModule } from 'react-native';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

/**
 * Shared contract of the native `Alarm` module.
 *
 * Both platforms register a legacy-style module named `Alarm` with these exact
 * method names (Android: AlarmModule.kt, iOS: ios/alarm/AlarmModule.swift) and
 * emit the same events through `NativeEventEmitter`:
 *   onAlarmFired | onAlarmDismissed | onAlarmSnoozed  -> AlarmEvent
 */

/** type: 'none' | 'daily' | 'weekly' | 'interval' */
export type AlarmRepeat = {
  type: string;
  weekdays?: number[]; // 1 = Sunday ... 7 = Saturday (weekly)
  intervalMs?: number; // interval
};

export type AlarmConfig = {
  alarmId?: string;
  timestamp: number; // ms since epoch
  title: string;
  body?: string;
  sound?: string; // 'default' or a bundled sound file name
  vibrate?: boolean; // Android only (iOS alarms always vibrate per system settings)
  snoozeEnabled?: boolean;
  snoozeMinutes?: number;
  repeat?: AlarmRepeat;
  data?: string; // JSON string payload
};

export type Alarm = {
  alarmId: string;
  timestamp: number;
  title: string;
  body: string;
  sound: string;
  vibrate: boolean;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
  repeat: AlarmRepeat;
  data: string;
  enabled: boolean;
  nextTriggerAt: number; // 0 if none
};

/** status: 'granted' | 'denied' | 'notDetermined' */
export type AlarmPermission = {
  status: string;
  notifications: boolean;
  canScheduleExact: boolean;
  canDrawOverlays: boolean; // Android only; always true on iOS
  canUseFullScreenIntent: boolean; // Android only; always true on iOS
  backend?: string; // iOS only: 'alarmkit' (iOS 26+) | 'notifications'
};

export type AlarmEvent = {
  alarmId: string;
  timestamp: number;
  title: string;
  body: string;
  data: string;
};

export interface Spec extends TurboModule {
  // ---------- Permissions ----------
  checkPermission(): Promise<AlarmPermission>;
  requestPermission(): Promise<AlarmPermission>;
  canScheduleExactAlarms(): Promise<boolean>;
  /** Opens the vendor Autostart screen on Android; resolves false on iOS. */
  openAutoStartSettings(): Promise<boolean>;

  // ---------- Scheduling ----------
  scheduleAlarm(config: AlarmConfig): Promise<string>;
  updateAlarm(alarmId: string, config: AlarmConfig): Promise<boolean>;
  cancelAlarm(alarmId: string): Promise<boolean>;
  cancelAllAlarms(): Promise<void>;

  // ---------- Control (while ringing) ----------
  stopAlarm(alarmId: string): Promise<void>;
  snoozeAlarm(alarmId: string, minutes: number): Promise<void>;
  getRingingAlarm(): Promise<Alarm | null>;

  // ---------- Queries ----------
  getAlarm(alarmId: string): Promise<Alarm | null>;
  getAllAlarms(): Promise<Alarm[]>;
  isScheduled(alarmId: string): Promise<boolean>;

  // ---------- Events (used by NativeEventEmitter) ----------
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const LINKING_ERROR =
  "react-native-alarms: the native 'Alarm' module is not linked. " +
  Platform.select({
    ios: "Run 'pod install' in the ios folder, then rebuild the app.",
    default: 'Rebuild the app after installing the package.',
  });

// Both platforms register a legacy module, reachable through either registry
// depending on the architecture. Throw on first use, not on import.
const Alarm: Spec =
  TurboModuleRegistry.get<Spec>('Alarm') ??
  NativeModules.Alarm ??
  new Proxy({} as Spec, {
    get() {
      throw new Error(LINKING_ERROR);
    },
  });

export default Alarm;
