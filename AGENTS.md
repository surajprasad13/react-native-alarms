# AGENTS.md

## Project Overview

`react-native-alarms` is a React Native library designed to provide reliable alarm functionality across Android and iOS.

The library may include JavaScript/TypeScript APIs, native Android and iOS implementations, alarm scheduling, notifications, event handling, and custom alarm interfaces.

The primary goals are:

- Reliability across supported platforms and operating-system versions.
- Predictable alarm scheduling, cancellation, and lifecycle behavior.
- Efficient resource and battery usage.
- A consistent developer experience for React Native applications.
- Backward compatibility and maintainable native code.

**Important:** Treat the existing implementation and documented behavior as the source of truth. Do not assume that a feature is supported on both platforms until you have verified the implementation.

## Instructions for AI Coding Agents

Before making changes:

1. Inspect the repository structure and `package.json`.
2. Read `README.md`, `CONTRIBUTING.md`, and relevant documentation.
3. Inspect the existing implementation before proposing a replacement.
4. Identify whether the requested change affects JavaScript/TypeScript, Android, iOS, or multiple layers.
5. Review related tests, configuration files, and existing patches.
6. Understand the expected behavior and platform-specific constraints before editing code.

Do not make broad or unrelated changes when a focused fix is sufficient.

### General Rules

- Preserve existing project conventions and architecture.
- Keep changes small, focused, and easy to review.
- Prefer existing dependencies and utilities over introducing new ones.
- Avoid unnecessary public API changes.
- Preserve TypeScript type safety.
- Handle errors and edge cases explicitly.
- Do not silently swallow errors.
- Do not modify generated files unless required by the project's build process.
- Never commit secrets, credentials, signing keys, or local environment files.
- Do not claim a test, build, or device scenario passed unless it was actually verified.
- Clearly identify any behavior that remains untested.

## Repository Exploration

Before changing files, inspect the available project scripts and directory layout.

Useful commands:

```bash
cat package.json
find . -maxdepth 3 -type f | sort
git status --short
```

Review the repository's actual structure rather than assuming specific directories, frameworks, or build commands exist.

Do not overwrite user changes or discard uncommitted work.

## JavaScript and TypeScript Guidelines

- Follow the existing formatting and naming conventions.
- Use explicit types for public APIs and event payloads.
- Keep platform-independent business logic separate from native implementation details.
- Validate inputs before invoking native modules.
- Maintain consistent error handling.
- Clean up event subscriptions and listeners when no longer required.
- Avoid memory leaks, duplicated listeners, and unnecessary re-renders.
- Document public methods, configuration options, and callbacks.

### Public API Compatibility

Before changing an exported method, event, property, or type:

1. Search for all usages in the repository.
2. Review the documented public API.
3. Check whether existing consumers could be affected.
4. Add or update tests.
5. Document any breaking changes and migration steps.

Do not rename or remove public exports without a clear requirement.

## Android Development Guidelines

When modifying Android native code:

- Follow the existing Java or Kotlin conventions used by the project.
- Respect Android application and activity lifecycle requirements.
- Check the minimum SDK and supported Android versions before using APIs.
- Handle notification and exact-alarm permissions where applicable.
- Respect Android background-execution and battery-management restrictions.
- Avoid unnecessary wake locks and background resource consumption.
- Ensure pending intents and alarm identifiers behave predictably.
- Handle cancellation, rescheduling, and duplicate requests correctly.
- Clean up receivers, callbacks, and other resources when appropriate.
- Follow applicable Android security and platform policies.

### Android Alarm Behavior

When modifying alarm scheduling or delivery, consider:

- Scheduling and cancellation.
- Repeated alarms.
- Device reboot behavior, if supported.
- Application foreground and background states.
- Process termination.
- Notification delivery.
- Full-screen intent restrictions and permissions.
- Doze mode and battery optimization.
- Android version and manufacturer differences.

Do not promise guaranteed delivery under every system condition. Verify the actual implementation and account for platform restrictions.

## iOS Development Guidelines

When modifying iOS native code:

- Follow the existing Swift or Objective-C conventions.
- Respect UIKit and application lifecycle requirements.
- Use the deployment target defined by the project.
- Handle notification authorization and scheduling correctly.
- Manage observers, callbacks, timers, and native resources safely.
- Avoid retain cycles and resource leaks.
- Handle app foreground and background transitions.
- Preserve compatibility with supported iOS versions.
- Respect system restrictions on background execution and alarm-like behavior.

### iOS Alarm Behavior

When working on alarm functionality, consider:

- Alarm scheduling and cancellation.
- Notification authorization.
- Application lifecycle transitions.
- Audio session configuration, where applicable.
- Repeated alarms and rescheduling.
- Device restart behavior, where supported.
- System-managed alarm capabilities, where available.
- Custom alarm interfaces and their presentation constraints.

Do not assume an application can execute arbitrary code or present a custom interface while suspended or terminated. Verify platform capabilities and use supported APIs.

## Cross-Platform Behavior

Android and iOS do not provide identical capabilities.

When implementing a cross-platform feature:

1. Define the expected public API.
2. Identify platform-specific behavior.
3. Implement each platform using its supported mechanisms.
4. Return consistent results where practical.
5. Document differences and limitations.
6. Test both platforms when the change affects shared behavior.

Never simulate unsupported operating-system guarantees through misleading documentation or API responses.

## Event and Lifecycle Management

For alarm-related events and callbacks:

- Preserve the documented event names and payload structure.
- Avoid firing the same event multiple times for one logical transition.
- Ensure cancellation and dismissal are handled consistently.
- Clean up native and JavaScript listeners appropriately.
- Avoid race conditions between scheduling, firing, dismissal, and snoozing.
- Ensure callbacks do not unintentionally retain obsolete objects.
- Consider repeated initialization and application lifecycle transitions.

Test event sequences, not just individual callbacks.

## Dependencies and Configuration

Before adding or upgrading dependencies:

- Verify React Native compatibility.
- Review peer dependencies.
- Check Android and iOS requirements.
- Consider bundle size and runtime overhead.
- Avoid unnecessary native dependencies.
- Update lockfiles when required by the project's package manager.
- Document any additional setup steps.

Do not change the package manager or lockfile format without a clear reason.

## Testing Requirements

Inspect `package.json` and existing project configuration to determine which checks are available.

Run the applicable checks before completing a change, such as:

- Linting.
- Type checking.
- Unit tests.
- Example application builds.
- Android native compilation.
- iOS native compilation.
- Manual device or emulator tests.

Do not invent npm scripts or assume a test framework is installed.

### Alarm-Specific Test Scenarios

Where relevant, verify:

- Creating and scheduling an alarm.
- Cancelling a scheduled alarm.
- Rescheduling an existing alarm.
- Handling duplicate scheduling requests.
- Triggering the correct event.
- Dismissing and snoozing alarms.
- Handling denied permissions.
- Managing foreground and background transitions.
- Releasing resources and event listeners.
- Handling supported reboot and process-restart scenarios.

Test on real devices when system-level behavior cannot be reliably validated in a simulator.

If only one platform is tested, state which platform remains unverified.

## Build and Debugging

When investigating build failures:

1. Capture the complete error message.
2. Identify the failing project, target, task, or script.
3. Determine whether the failure is caused by the current change or the existing environment.
4. Make the smallest appropriate fix.
5. Re-run the failing check.
6. Inspect the final diff.

Avoid destructive cleanup commands unless necessary. Never delete project files, signing configuration, or user changes simply to make a build pass.

## Documentation Requirements

Update documentation whenever a change affects:

- Installation or native setup.
- Public methods and configuration options.
- Permissions or platform requirements.
- Supported operating-system versions.
- Events and callback payloads.
- Alarm scheduling semantics.
- Known limitations.
- Troubleshooting instructions.

Examples must match the actual implementation.

## Git and Code Review

Before committing changes:

```bash
git status --short
git diff --check
git diff
```

Follow the commit conventions in `CONTRIBUTING.md`.

Prefer focused commits and pull requests. Do not rewrite Git history, force-push, or amend existing commits unless explicitly requested.

Never include unrelated changes in a pull request.

## Security and Privacy

- Do not hardcode credentials or API keys.
- Do not log sensitive information unnecessarily.
- Validate data crossing the JavaScript/native boundary.
- Use appropriate Android permissions and iOS authorization mechanisms.
- Follow platform security requirements.
- Report security-sensitive issues through the repository's designated private reporting channel.

## Completion Checklist

Before declaring a task complete:

- [ ] The requested behavior is implemented.
- [ ] Existing functionality and public APIs are preserved where possible.
- [ ] Relevant platform-specific requirements are respected.
- [ ] Tests or builds have been run where available.
- [ ] Changes have been reviewed with `git diff`.
- [ ] Documentation has been updated where needed.
- [ ] Limitations and untested scenarios are clearly stated.
- [ ] No unrelated changes, credentials, or generated artifacts were added.

## Final Response Requirements

When reporting completed
