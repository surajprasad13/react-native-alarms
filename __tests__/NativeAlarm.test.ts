import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

const mockNativeAlarm = {
  checkPermission: jest.fn(),
  requestPermission: jest.fn(),
  canScheduleExactAlarms: jest.fn(),
  openAutoStartSettings: jest.fn(),
  scheduleAlarm: jest.fn(),
  updateAlarm: jest.fn(),
  cancelAlarm: jest.fn(),
  cancelAllAlarms: jest.fn(),
  stopAlarm: jest.fn(),
  snoozeAlarm: jest.fn(),
  getRingingAlarm: jest.fn(),
  getAlarm: jest.fn(),
  getAllAlarms: jest.fn(),
  isScheduled: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

describe('Native Alarm module', () => {
  const originalAlarm = NativeModules.Alarm;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    Object.defineProperty(NativeModules, 'Alarm', {
      configurable: true,
      value: undefined,
    });

    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    Object.defineProperty(NativeModules, 'Alarm', {
      configurable: true,
      value: originalAlarm,
    });
  });

  it('uses the TurboModule registry when Alarm is available', () => {
    jest
      .spyOn(TurboModuleRegistry, 'get')
      .mockReturnValue(mockNativeAlarm as never);

    const Alarm = require('../specs/NativeAlarm').default;

    expect(TurboModuleRegistry.get).toHaveBeenCalledWith('Alarm');
    expect(Alarm).toBe(mockNativeAlarm);
  });

  it('falls back to NativeModules.Alarm', () => {
    Object.defineProperty(NativeModules, 'Alarm', {
      configurable: true,
      value: mockNativeAlarm,
    });

    const Alarm = require('../specs/NativeAlarm').default;

    expect(Alarm).toBe(mockNativeAlarm);
  });

  it('does not throw when imported without a linked native module', () => {
    expect(() => require('../specs/NativeAlarm')).not.toThrow();
  });

  it('throws a helpful error when a method is accessed without native linking', () => {
    const Alarm = require('../specs/NativeAlarm').default;

    expect(() => Alarm.scheduleAlarm).toThrow(
      /react-native-alarms: the native 'Alarm' module is not linked/,
    );
  });

  it('uses the actionable linking error through AlarmService', async () => {
    const { AlarmService } = require('../AlarmService');

    await expect(AlarmService.checkPermission()).rejects.toThrow(
      /native 'Alarm' module is not linked/,
    );
  });

  it('allows event subscriptions to be registered before native linking', () => {
    const { AlarmService } = require('../AlarmService');
    const unsubscribe = AlarmService.onAlarmFired(jest.fn());

    expect(unsubscribe()).toBeUndefined();
  });

  it('includes iOS setup instructions in the linking error', () => {
    jest
      .spyOn(Platform, 'select')
      .mockReturnValue(
        "Run 'pod install' in the ios folder, then rebuild the app.",
      );

    const Alarm = require('../specs/NativeAlarm').default;

    expect(() => Alarm.scheduleAlarm).toThrow(/pod install/);
  });

  it('exposes the expected native methods', () => {
    jest
      .spyOn(TurboModuleRegistry, 'get')
      .mockReturnValue(mockNativeAlarm as never);

    const Alarm = require('../specs/NativeAlarm').default;

    const methods = [
      'checkPermission',
      'requestPermission',
      'canScheduleExactAlarms',
      'openAutoStartSettings',
      'scheduleAlarm',
      'updateAlarm',
      'cancelAlarm',
      'cancelAllAlarms',
      'stopAlarm',
      'snoozeAlarm',
      'getRingingAlarm',
      'getAlarm',
      'getAllAlarms',
      'isScheduled',
      'addListener',
      'removeListeners',
    ];

    methods.forEach(method => {
      expect(Alarm).toHaveProperty(method);
      expect(typeof Alarm[method as keyof typeof Alarm]).toBe('function');
    });
  });
});
