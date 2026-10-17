/**
 * React Native Alarms - Cross-platform alarm management module
 *
 * Provides consistent alarm scheduling, management, and event handling
 * for both Android and iOS platforms.
 */

export type {
  AlarmRepeat,
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
  Spec as AlarmModuleSpec,
} from './specs/NativeAlarm';

// Default export for backward compatibility
import NativeAlarm from './specs/NativeAlarm';
export default NativeAlarm;
