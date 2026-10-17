import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Register the alarm notification delegate/actions before anything can fire, so a
    // tap on an alarm notification that launches the app reaches the Alarm module.
    NotificationBackend.install()
    return true
  }
}
