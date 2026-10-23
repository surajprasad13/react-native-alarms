import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AppState,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import type { AlarmEvent, AlarmPermission } from '../../specs/NativeAlarm';

// Same module name and API on Android (AlarmModule.kt) and iOS (AlarmModule.swift).
const { Alarm } = NativeModules;
console.log(
  '[AlarmDemo] NativeModules.Alarm =',
  Alarm,
  Object.keys(Alarm ?? {}),
);

// Guard: creating an emitter with an undefined module crashes the app
const alarmEmitter = Alarm ? new NativeEventEmitter(Alarm) : null;

const pad = (n: number) => n.toString().padStart(2, '0');

export function AlarmDemo() {
  const [perms, setPerms] = useState<AlarmPermission | null>(null);

  const refreshPermissions = useCallback(async () => {
    if (!Alarm) return;
    try {
      setPerms(await Alarm.checkPermission());
    } catch {}
  }, []);

  useEffect(() => {
    refreshPermissions();
    // Re-check when coming back from a settings screen.
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshPermissions();
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  useEffect(() => {
    if (!alarmEmitter) return;

    const subscriptions = [
      alarmEmitter.addListener('onAlarmFired', data => {
        console.log('Alarm fired', (data as AlarmEvent)?.alarmId);
      }),
      alarmEmitter.addListener('onAlarmDismissed', data => {
        console.log('Alarm dismissed', (data as AlarmEvent)?.alarmId);
      }),
      alarmEmitter.addListener('onAlarmSnoozed', data => {
        console.log('Alarm snoozed', (data as AlarmEvent)?.alarmId);
      }),
    ];

    return () => subscriptions.forEach(sub => sub.remove());
  }, []);

  const requestPermissions = async () => {
    if (!Alarm) return;
    try {
      setPerms(await Alarm.requestPermission());
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Permission request failed');
    }
  };

  const openAutoStart = async () => {
    if (!Alarm) return;
    try {
      const opened = await Alarm.openAutoStartSettings();
      if (!opened) {
        Alert.alert(
          'Not needed',
          'This device has no vendor Autostart screen; nothing to change.',
        );
      }
    } catch {}
  };

  const isAndroid = Platform.OS === 'android';

  const allGranted =
    !!perms &&
    perms.notifications &&
    perms.canScheduleExact &&
    (!isAndroid || (perms.canDrawOverlays && perms.canUseFullScreenIntent));

  const scheduleInOneMinute = async () => {
    if (!Alarm) {
      Alert.alert('Error', 'Alarm native module is not linked');
      return;
    }

    try {
      const alarmTime = new Date(Date.now() + 30 * 1000);
      const label = `${pad(alarmTime.getHours())}:${pad(
        alarmTime.getMinutes(),
      )}`;

      const alarmId = await Alarm.scheduleAlarm({
        alarmId: `alarm_${Date.now()}`,
        timestamp: alarmTime.getTime(),
        enabled: true,
        repeat: { type: 'none' },
        title: `Alarm at ${label}`,
        body: 'Test Alarm',
        data: 'Test Alarm',
        vibrate: true,
        sound: 'default',
        snoozeEnabled: true,
        snoozeMinutes: 1,
      });

      Alert.alert('Alarm set', `Rings at ${label} (ID: ${alarmId})`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to schedule alarm');
    }
  };

  return (
    <View style={styles.container}>
      {perms && !allGranted ? (
        <View style={styles.permBox}>
          <Text style={styles.permTitle}>
            Permissions needed to ring reliably
          </Text>
          {isAndroid ? (
            <>
              <Text style={styles.permLine}>
                Notifications: {perms.notifications ? 'ok' : 'missing'}
              </Text>
              <Text style={styles.permLine}>
                Exact alarms: {perms.canScheduleExact ? 'ok' : 'missing'}
              </Text>
              <Text style={styles.permLine}>
                Display over other apps:{' '}
                {perms.canDrawOverlays ? 'ok' : 'missing'}
              </Text>
              <Text style={styles.permLine}>
                Full-screen intent:{' '}
                {perms.canUseFullScreenIntent ? 'ok' : 'missing'}
              </Text>
            </>
          ) : (
            <Text style={styles.permLine}>
              {perms.backend === 'alarmkit' ? 'Alarms' : 'Notifications'}:{' '}
              {perms.status}
            </Text>
          )}
          <TouchableOpacity
            style={styles.permButton}
            onPress={requestPermissions}
          >
            <Text style={styles.buttonText}>Grant next permission</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={scheduleInOneMinute}>
        <Text style={styles.buttonText}>Set alarm in 1 minute</Text>
      </TouchableOpacity>

      {isAndroid ? (
        <TouchableOpacity style={styles.linkButton} onPress={openAutoStart}>
          <Text style={styles.linkText}>
            Xiaomi / Oppo / Vivo: enable Autostart for this app
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  permBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  permTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  permLine: { color: '#555', marginBottom: 2 },
  permButton: {
    marginTop: 12,
    backgroundColor: '#FB8C00',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: { marginTop: 20, padding: 8 },
  linkText: { color: '#007AFF', textDecorationLine: 'underline' },
});
