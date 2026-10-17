/**
 * React Native Alarms - Cross-platform alarm management module
 *
 * Provides consistent alarm scheduling, management, and event handling
 * for both Android and iOS platforms.
 */

export {
  AlarmRepeat,
  AlarmConfig,
  Alarm,
  AlarmPermission,
  AlarmEvent,
  Spec as AlarmModuleSpec,
} from './specs/NativeAlarm';

export { AlarmDemo } from './AlarmDemo';

// Default export for backward compatibility
import NativeAlarm from './specs/NativeAlarm';
export default NativeAlarm;
