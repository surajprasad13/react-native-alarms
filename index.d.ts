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
  Spec as AlarmModuleSpec,
} from './specs/NativeAlarm';

// Default export for type compatibility
export type { Spec as default } from './specs/NativeAlarm';
