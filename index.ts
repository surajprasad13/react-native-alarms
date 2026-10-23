/**
 * React Native Alarms - Cross-platform alarm management module
 *
 * Provides consistent alarm scheduling, management, and event handling
 * for both Android and iOS platforms.
 */

export type {
  AlarmRepeat,
  AlarmConfig,
  AlarmProp,
  AlarmPermission,
  AlarmEvent,
} from './src/types';

export { AlarmService } from './AlarmService';

import Alarm from './specs/NativeAlarm';

export default Alarm;
