/**
 * React Native Alarms - Type definitions
 * Cross-platform alarm management for React Native
 */

export type {
  AlarmRepeat,
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
} from './specs/NativeAlarm';

export type { Spec as AlarmModuleSpec } from './specs/NativeAlarm';

// Default export for backward compatibility
import type NativeAlarm from './specs/NativeAlarm';
export default NativeAlarm;
