/**
 * React Native Alarms - Type definitions
 * Cross-platform alarm management for React Native
 */

import type { Spec } from './specs/NativeAlarm';

export type {
  AlarmRepeat,
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
  Spec as AlarmModuleSpec,
} from './specs/NativeAlarm';

export { AlarmService } from './AlarmService';

declare const Alarm: Spec;
export default Alarm;
