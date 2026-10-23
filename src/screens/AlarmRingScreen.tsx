import React, { useEffect } from 'react';
import {
  BackHandler,
  NativeModules,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { Alarm } = NativeModules;

/**
 * Initial props come from the native AlarmRingActivity (AlarmData.toBundle()).
 */
type Props = {
  alarmId?: string;
  title?: string;
  body?: string;
  snoozeEnabled?: boolean;
  snoozeMinutes?: number;
  data?: string;
};

const pad = (n: number) => n.toString().padStart(2, '0');

export function AlarmRingScreen({
  alarmId = '',
  title = 'Alarm',
  body = '',
  snoozeEnabled = true,
  snoozeMinutes = 5,
}: Props) {
  // The only ways out are Stop and Snooze: swallow the back button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const now = new Date();
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const stop = () => {
    Alarm?.stopAlarm(alarmId).catch(() => {});
  };

  const snooze = () => {
    Alarm?.snoozeAlarm(alarmId, snoozeMinutes).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <Text style={styles.clock}>{clock}</Text>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}

      <View style={styles.actions}>
        {snoozeEnabled ? (
          <TouchableOpacity
            style={[styles.button, styles.snooze]}
            onPress={snooze}
          >
            <Text style={styles.buttonText}>Snooze {snoozeMinutes} min</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.button, styles.stop]} onPress={stop}>
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F1430',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  clock: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '200',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: '#C5CAE9',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  snooze: { backgroundColor: '#2E3560' },
  stop: { backgroundColor: '#FF8F2E' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default AlarmRingScreen;
