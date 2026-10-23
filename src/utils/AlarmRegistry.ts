/**
 * Registered React Native screens that can be presented by the alarm system.
 */

export type AlarmScreenProps = Record<string, unknown>;

export interface AlarmScreenRegistration {
  /** Unique key used in an alarm's presentation configuration. */
  type: string;

  /** Name registered with React Native's AppRegistry. */
  componentName: string;
}

const DEFAULT_COMPONENT_NAME = 'AlarmRing';

const registrations = new Map<string, AlarmScreenRegistration>();

/**
 * Registers a screen that can be used for alarm presentation.
 *
 * The component must also be registered using AppRegistry.registerComponent.
 *
 * @example
 * AlarmRegistry.register('reminder', 'ReminderScreen');
 */
export const AlarmRegistry = {
  register(type: string, componentName: string): void {
    if (!type.trim() || !componentName.trim()) {
      throw new Error('Alarm type and component name are required.');
    }

    registrations.set(type, { type, componentName });
  },

  unregister(type: string): boolean {
    return registrations.delete(type);
  },

  resolve(type?: string): string {
    if (!type) {
      return DEFAULT_COMPONENT_NAME;
    }

    const registration = registrations.get(type);

    if (!registration) {
      throw new Error(`No alarm screen registered for type "${type}".`);
    }

    return registration.componentName;
  },

  getRegisteredScreens(): AlarmScreenRegistration[] {
    return Array.from(registrations.values());
  },
};
