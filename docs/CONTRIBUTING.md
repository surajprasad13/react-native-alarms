# Contributing to react-native-alarms

First off, thank you for considering contributing to `react-native-alarms`! Contributions of all kinds are welcome, including bug reports, feature requests, documentation improvements, tests, and code contributions.

Our goal is to provide a reliable, efficient, and production-ready alarm experience for React Native applications on both Android and iOS.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Development Guidelines](#development-guidelines)
- [Android and iOS Contributions](#android-and-ios-contributions)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation](#documentation)
- [Security Issues](#security-issues)
- [License](#license)

## Code of Conduct

Please be respectful, constructive, and inclusive when interacting with maintainers and other contributors.

- Be kind and professional.
- Welcome constructive feedback.
- Focus on improving the library.
- Avoid personal attacks, harassment, or disrespectful behavior.

## Ways to Contribute

You can help improve this library by:

- Reporting bugs and unexpected behavior.
- Suggesting new features or improvements.
- Fixing existing issues.
- Improving Android and iOS native implementations.
- Improving React Native and TypeScript integration.
- Adding or improving automated tests.
- Improving documentation and examples.
- Testing compatibility with different React Native versions and devices.

Before starting significant work, please check existing issues and discussions to avoid duplicating ongoing work.

## Development Setup

### Prerequisites

Ensure that you have the following installed:

- Node.js and npm.
- React Native development environment.
- Android Studio and Android SDK for Android development.
- Xcode and CocoaPods for iOS development on macOS.
- Git.

### Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork:

   ```bash
   git clone https://github.com/<your-username>/react-native-alarms.git
   cd react-native-alarms
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feat/your-feature-name
   ```

   For bug fixes, use a branch such as:

   ```bash
   git checkout -b fix/your-bug-name
   ```

Replace the repository URL with the actual repository URL if your fork uses a different name.

### Running the Example Application

If the repository includes an example application, use it to test your changes against a real React Native project.

Follow the repository's existing instructions for installing example dependencies and running the Android or iOS application.

Do not assume that a change works solely because it compiles. Verify its behavior on the relevant platform.

## Development Guidelines

Please follow these principles when contributing code.

### General Guidelines

- Keep changes focused and easy to review.
- Follow the existing project structure and coding conventions.
- Use TypeScript types appropriately.
- Avoid introducing unnecessary dependencies.
- Preserve backward compatibility whenever possible.
- Handle errors and edge cases explicitly.
- Update documentation when changing public APIs or behavior.
- Do not commit generated files, build artifacts, credentials, or local environment files unless explicitly required by the project.

### API Compatibility

Changes to public methods, properties, callbacks, or configuration options should be documented.

Avoid breaking existing applications without a clear reason. If a breaking change is necessary, explain its impact and migration path in the pull request.

### Performance and Reliability

Alarm functionality must remain predictable and reliable.

Pay particular attention to:

- Scheduling and cancellation.
- Repeated alarms and rescheduling.
- App lifecycle transitions.
- Device reboot behavior, where supported.
- Background execution and battery restrictions.
- Notification delivery and full-screen alarm experiences, where supported.
- Permissions and platform-specific restrictions.
- Cleanup of native resources and event listeners.

Do not introduce assumptions about operating-system behavior that have not been tested on the relevant platform and OS version.

## Android and iOS Contributions

This library includes platform-specific behavior, so contributions must respect the differences between Android and iOS.

### Android

When modifying Android code:

- Follow Android lifecycle and background-execution requirements.
- Handle runtime permissions and notification permissions correctly.
- Consider Android version differences and manufacturer-specific restrictions.
- Test alarm scheduling, cancellation, notification delivery, and relevant full-screen behavior.
- Avoid unnecessary battery consumption and resource leaks.
- Follow applicable Android platform policies and API requirements.

### iOS

When modifying iOS code:

- Follow UIKit and application lifecycle requirements.
- Handle notification permissions and scheduling correctly.
- Test behavior when the application is foregrounded, backgrounded, or not running.
- Manage observers, callbacks, and native resources safely.
- Respect iOS restrictions on background execution and alarm-like experiences.

**Important:** Android and iOS have different system-level capabilities and restrictions. Do not assume that a behavior available on one platform can be implemented identically on the other. Document platform-specific limitations where appropriate.

## Testing

Before submitting a pull request, run the checks supported by the repository.

At a minimum:

- Verify that dependencies install successfully.
- Run available linting and type checks.
- Run relevant automated tests.
- Build and test the affected platform.
- Test the behavior in a React Native application.
- Check for regressions in existing functionality.

For alarm-related changes, test relevant scenarios such as:

- Scheduling an alarm.
- Cancelling an alarm.
- Handling repeated or overlapping alarm requests.
- Opening and dismissing the alarm interface.
- Handling permission denial.
- Testing foreground and background transitions.
- Verifying behavior after device restart, if supported.
- Checking compatibility with relevant Android and iOS versions.

Do not claim a test passed unless you have actually run it.

If you cannot test a platform, clearly state that limitation in your pull request.

## Reporting Bugs

Before opening a new issue, check whether the problem has already been reported.

Include as much of the following information as possible:

- A clear and descriptive title.
- Library version.
- React Native version.
- Android or iOS version.
- Device or emulator details.
- Steps to reproduce the problem.
- Expected behavior.
- Actual behavior.
- Relevant logs, stack traces, or screenshots.
- A minimal reproduction project, when practical.

Remove access tokens, passwords, personal information, and other sensitive data before sharing logs.

## Submitting Pull Requests

1. Create a focused feature or fix branch.
2. Implement the change following the project's conventions.
3. Add or update tests where appropriate.
4. Update documentation if necessary.
5. Run the relevant checks.
6. Commit your changes with a descriptive message.
7. Push your branch to your fork.
8. Open a pull request against the appropriate upstream branch.

### Pull Request Checklist

Before submitting, verify the following:

- [ ] The change addresses a specific issue or improvement.
- [ ] The implementation follows the existing coding conventions.
- [ ] Relevant tests have been added or updated.
- [ ] Available linting, type checks, and builds have been run.
- [ ] Android and iOS behavior has been tested where applicable.
- [ ] Public API changes are documented.
- [ ] No unrelated changes or generated artifacts are included.
- [ ] No credentials or sensitive information are included.
- [ ] Known limitations and untested scenarios are disclosed.

### Pull Request Description

Please explain:

- What the change does.
