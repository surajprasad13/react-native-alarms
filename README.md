# React Native Alarms 🔔

A powerful, cross-platform alarm management library for React Native. Schedule, manage, and control alarms on both Android and iOS with a unified API.

[![npm version](https://badge.fury.io/js/react-native-alarms.svg)](https://badge.fury.io/js/react-native-alarms)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✨ **Cross-Platform Support**
- Seamless support for both Android and iOS
- Native alarm implementation for reliable delivery
- Background execution support

🎯 **Comprehensive Alarm Management**
- Schedule one-time and recurring alarms (daily, weekly, interval-based)
- Update and cancel alarms
- Snooze and stop currently ringing alarms
- Query alarm status

🔔 **Event-Driven Architecture**
- Real-time events for alarm firing, dismissal, and snoozing
- Easy event listener registration and cleanup
- Full-screen alarm display on iOS 26+ with AlarmKit
- Fallback to notifications on older devices

🔐 **Permission Handling**
- Automatic permission checking and requesting
- Platform-specific permission management
- Detailed permission status reporting

## Installation

```bash
npm install react-native-alarms
# or
yarn add react-native-alarms
```

### Native Module Linking

Since this is a native module, you'll need to link it:

```bash
cd ios && pod install && cd ..
```

For Android, the native code auto-links, including the permissions, ring activity,
service and receivers in its manifest. No `MainApplication` or `AndroidManifest.xml`
changes are needed. Rebuild the app after installing.

### Register the ring screen

When an alarm rings, both platforms show a full-screen React component registered as
`AlarmRing`, with the alarm (`alarmId`, `title`, `body`, `snoozeEnabled`,
`snoozeMinutes`, `data`) as props. Register your own component in `index.js`:

```js
import { AppRegistry } from 'react-native';
import { AlarmRingScreen } from './src/AlarmRingScreen';

AppRegistry.registerComponent('AlarmRing', () => AlarmRingScreen);
```

Call `Alarm.stopAlarm(alarmId)` or `Alarm.snoozeAlarm(alarmId, minutes)` from its
buttons; the screen closes itself.

### Direct module access

```ts
import Alarm, { AlarmService } from 'react-native-alarms';

const id = await Alarm.scheduleAlarm({ timestamp: Date.now() + 60_000, title: 'Wake up' });
```

## Quick Start

### Basic Usage

```typescript
import { AlarmService } from 'react-native-alarms/service';

// Check permissions
const permission = await AlarmService.checkPermission();

// Request permissions if needed
if (permission.status !== 'granted') {
  await AlarmService.requestPermission();
}

// Schedule an alarm for 10 minutes from now
const alarmId = await AlarmService.scheduleAlarm({
  timestamp: Date.now() + 10 * 60 * 1000,
  title: 'Wake up!',
  body: 'Time to start your day',
  vibrate: true,
  snoozeEnabled: true,
  snoozeMinutes: 5,
});

console.log('Alarm scheduled:', alarmId);
```

### Listening to Alarm Events

```typescript
import { AlarmService } from 'react-native-alarms/service';

// Listen for when alarm fires
const unsubscribeFired = AlarmService.onAlarmFired((alarm) => {
  console.log('Alarm fired:', alarm.title);
});

// Listen for when alarm is dismissed
const unsubscribeDismissed = AlarmService.onAlarmDismissed((alarm) => {
  console.log('Alarm dismissed:', alarm.alarmId);
});

// Listen for when alarm is snoozed
const unsubscribeSnoozed = AlarmService.onAlarmSnoozed((alarm) => {
  console.log('Alarm snoozed:', alarm.alarmId);
});

// Cleanup listeners when done
unsubscribeFired();
unsubscribeDismissed();
unsubscribeSnoozed();
```

### Managing Alarms

```typescript
import { AlarmService } from 'react-native-alarms/service';

// Get all scheduled alarms
const alarms = await AlarmService.getAllAlarms();

// Get a specific alarm
const alarm = await AlarmService.getAlarm(alarmId);

// Check if alarm is scheduled
const isScheduled = await AlarmService.isScheduled(alarmId);

// Update an alarm
await AlarmService.updateAlarm(alarmId, {
  timestamp: Date.now() + 20 * 60 * 1000,
  title: 'Updated alarm',
});

// Snooze the currently ringing alarm
await AlarmService.snoozeAlarm(alarmId, 10); // Snooze for 10 minutes

// Stop the currently ringing alarm
await AlarmService.stopAlarm(alarmId);

// Cancel a specific alarm
await AlarmService.cancelAlarm(alarmId);

// Cancel all alarms
await AlarmService.cancelAllAlarms();
```

## API Reference

### Types

#### `AlarmConfig`
Configuration object for scheduling alarms.

```typescript
type AlarmConfig = {
  alarmId?: string;           // Unique identifier (auto-generated if omitted)
  timestamp: number;          // Time in milliseconds (Date.now() format)
  title: string;              // Alarm title/label
  body?: string;              // Alarm description
  sound?: string;             // 'default' or custom sound file name
  vibrate?: boolean;          // Enable vibration (Android only)
  snoozeEnabled?: boolean;    // Allow snoozing
  snoozeMinutes?: number;     // Snooze duration in minutes
  repeat?: AlarmRepeat;       // Repeat configuration
  data?: string;              // Custom JSON string payload
};
```

#### `AlarmRepeat`
Repeat configuration for recurring alarms.

```typescript
type AlarmRepeat = {
  type: 'none' | 'daily' | 'weekly' | 'interval';
  weekdays?: number[];        // 1 = Sunday, 7 = Saturday (for weekly)
  intervalMs?: number;        // Interval in milliseconds (for interval type)
};
```

#### `Alarm`
Alarm object returned from queries.

```typescript
type Alarm = {
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
  nextTriggerAt: number;      // 0 if no future trigger
};
```

#### `AlarmPermission`
Permission status object.

```typescript
type AlarmPermission = {
  status: 'granted' | 'denied' | 'notDetermined';
  notifications: boolean;
  canScheduleExact: boolean;
  canDrawOverlays: boolean;   // Android only
  canUseFullScreenIntent: boolean; // Android only
  backend?: string;           // iOS only: 'alarmkit' or 'notifications'
};
```

## Platform-Specific Behavior

### iOS
- **iOS 26+**: Uses native AlarmKit for real alarms that bypass silent mode
- **iOS < 26**: Falls back to local notifications
- Always handles vibration through system settings
- Full-screen alarm display with system Stop/Snooze buttons

### Android
- Requires `SCHEDULE_EXACT_ALARM` permission for exact timing
- Uses full-screen notifications on lock screen
- Respects silent mode (can be overridden with system settings)
- Supports custom sounds from app bundle or file system

## Repeat Types

### None (One-time)
```typescript
{ type: 'none' }
```

### Daily
Rings at the same time every day.
```typescript
{ type: 'daily' }
```

### Weekly
Rings at the same time on specified days.
```typescript
{
  type: 'weekly',
  weekdays: [1, 3, 5] // Sunday, Wednesday, Friday
}
```

### Interval
Rings at regular intervals. Note: intervals reset if the app is killed.
```typescript
{
  type: 'interval',
  intervalMs: 3600000 // Every hour
}
```

## Building Your Own Alarm UI

The library provides the core alarm management logic. You build your own UI components. Here's a complete example:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlarmService } from 'react-native-alarms/service';

export function AlarmScreen() {
  const [alarms, setAlarms] = useState([]);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    initializeAlarms();
  }, []);

  const initializeAlarms = async () => {
    const perms = await AlarmService.checkPermission();
    setPermissions(perms);

    if (perms.status !== 'granted') {
      await AlarmService.requestPermission();
    }

    const allAlarms = await AlarmService.getAllAlarms();
    setAlarms(allAlarms);

    const unsubFired = AlarmService.onAlarmFired((alarm) => {
      console.log('🔔 Alarm fired:', alarm.title);
    });

    const unsubSnoozed = AlarmService.onAlarmSnoozed((alarm) => {
      console.log('😴 Alarm snoozed:', alarm.title);
    });

    return () => {
      unsubFired();
      unsubSnoozed();
    };
  };

  const scheduleAlarm = async () => {
    const alarmId = await AlarmService.scheduleAlarm({
      timestamp: Date.now() + 5 * 60 * 1000,
      title: 'Time for a break!',
      body: 'Take a moment to rest',
      vibrate: true,
      snoozeEnabled: true,
      snoozeMinutes: 5,
    });

    const updated = await AlarmService.getAllAlarms();
    setAlarms(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alarm Manager</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={scheduleAlarm}
      >
        <Text style={styles.buttonText}>Schedule Alarm</Text>
      </TouchableOpacity>

      <View style={styles.list}>
        {alarms.map((alarm) => (
          <View key={alarm.alarmId} style={styles.alarmItem}>
            <Text>{alarm.title}</Text>
            <Text>{new Date(alarm.timestamp).toLocaleTimeString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  list: { marginTop: 20 },
  alarmItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
```

## Troubleshooting

### "Alarm Native module is not linked"
Ensure the native module is properly linked:
```bash
cd ios && pod install && cd ..
```

### Alarms not triggering
1. Check permissions: `await AlarmService.checkPermission()`
2. Ensure app has necessary permissions:
   - Android: `SCHEDULE_EXACT_ALARM`, `POST_NOTIFICATIONS`
   - iOS: Allow notifications in Settings

### iOS-specific: Notifications instead of full-screen alarm
- Full-screen alarms (AlarmKit) require iOS 26+
- Older devices use local notifications
- Check `permission.backend` to see which is active

### Android-specific: Alarm doesn't ring when app is killed
- Enable Autostart permissions on device
- Check device's battery optimization settings
- Some OEMs require manual approval in their app management screens

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © 2024 Suraj Prasad

## Support

For issues and questions, please visit:
- GitHub Issues: https://github.com/surajprasad13/react-native-alarms/issues
- Email: surajvishwakarma830@gmail.com

## Changelog

### v0.1.0
- Improved TypeScript support with proper type exports
- Added AlarmService convenience class
- Comprehensive documentation
- Fixed module linking issues

### v0.0.1
- Initial release
- Cross-platform alarm scheduling
- Event-driven architecture
- Permission management

## Custom Alarm UI & Custom Data

The library supports completely custom alarm UI screens with custom data payloads.

### Basic Custom Screen Example

```typescript
import { NativeModules } from 'react-native';
import { AlarmService } from 'react-native-alarms/service';

export function MyCustomAlarmScreen({ alarmId, title, data }) {
  const customData = JSON.parse(data || '{}');

  return (
    <View style={{ backgroundColor: customData.color }}>
      <Text>{title}</Text>
      <TouchableOpacity onPress={() => AlarmService.stopAlarm(alarmId)}>
        <Text>Stop</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Passing Custom Data

```typescript
await AlarmService.scheduleAlarm({
  timestamp: Date.now() + 5 * 60 * 1000,
  title: 'Important!',
  data: JSON.stringify({
    backgroundColor: '#FF5252',
    priority: 'high',
    customMessage: 'This is urgent!',
  }),
});
```

**Full Guide:** See [CUSTOM_UI_GUIDE.md](./CUSTOM_UI_GUIDE.md) for complete examples and best practices.

