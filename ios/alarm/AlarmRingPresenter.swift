import React
import UIKit

/// iOS counterpart of Android's `AlarmRingActivity`: presents the React component
/// registered as `AlarmRing` full screen, with the ringing alarm as initial props.
///
/// iOS cannot launch an app or draw over the lock screen from a local notification,
/// so this shows when the alarm fires while the app is in the foreground, or when the
/// user opens the app by tapping the alarm notification.
final class AlarmRingPresenter {
  static let componentName = "AlarmRing"

  private static weak var controller: UIViewController?
  private static var alarmId: String?

  static func present(_ alarm: AlarmData, bridge: RCTBridge?, attempt: Int = 0) {
    DispatchQueue.main.async {
      if controller != nil, alarmId == alarm.id {
        // Already showing (e.g. presented while backgrounded, now foregrounded):
        // still make sure the native sound yields to the screen's own TTS.
        silenceIfActive(alarm.id)
        return
      }
      // Cold start from a notification tap or the AlarmKit "Open" button: the root
      // surface or window may not be ready yet, so retry for up to ~15 s.
      guard let surface = makeSurface(bridge, props: alarm.toDictionary()),
            let top = topViewController() else {
        if attempt < 60 {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            present(alarm, bridge: bridge, attempt: attempt + 1)
          }
        } else {
          NSLog("[react-native-alarms] Could not present %@: no surface presenter or window", componentName)
        }
        return
      }

      let vc = UIViewController()
      let root = RCTSurfaceHostingProxyRootView(surface: surface)
      root.backgroundColor = .systemBackground
      vc.view = root
      surface.start()
      vc.modalPresentationStyle = .fullScreen
      vc.isModalInPresentation = true

      let show = {
        top.present(vc, animated: true)
        controller = vc
        alarmId = alarm.id
        silenceIfActive(alarm.id)
      }
      if let existing = controller {
        existing.dismiss(animated: false, completion: show)
      } else {
        show()
      }
    }
  }

  /// The ring screen speaks the task via TTS, and iOS won't play it over the
  /// notification / AlarmKit sound, so stop that sound once the screen is up.
  /// Only while the app is frontmost: in the background the system alert is the
  /// only thing the user can hear, so it must keep ringing.
  private static func silenceIfActive(_ id: String) {
    guard UIApplication.shared.applicationState == .active else { return }
    NotificationBackend.shared.silence(id)
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) { AlarmKitBackend.shared.silence(id) }
    #endif
  }

  /// Called when ringing ends for any reason (stop, snooze, cancel).
  static func dismiss(_ id: String? = nil) {
    DispatchQueue.main.async {
      guard let vc = controller, id == nil || id == alarmId else { return }
      controller = nil
      alarmId = nil
      vc.dismiss(animated: true)
    }
  }

  private static let createSurface = NSSelectorFromString("createFabricSurfaceForModuleName:initialProperties:")

  /// `RCTSurfacePresenter` implements `createFabricSurfaceForModuleName:initialProperties:`
  /// without formally adopting `RCTSurfacePresenterStub`, and its header is ObjC++ (not
  /// importable from Swift), so call it by selector.
  private static func makeSurface(_ bridge: RCTBridge?, props: [String: Any]) -> RCTSurfaceProtocol? {
    guard let presenter = surfacePresenter(bridge), presenter.responds(to: createSurface) else { return nil }
    return presenter.perform(createSurface, with: componentName, with: props)?
      .takeUnretainedValue() as? RCTSurfaceProtocol
  }

  /// Bridgeless mode skips `bridge.surfacePresenter` (and injection) for modules
  /// registered with `RCT_EXTERN_MODULE`, so fall back to the presenter of the app's
  /// root React surface, which `RCTFabricSurface` keeps in a weak `_surfacePresenter` ivar.
  private static func surfacePresenter(_ bridge: RCTBridge?) -> NSObject? {
    if let p = bridge?.surfacePresenter() as? NSObject { return p }
    guard let root = keyWindow()?.rootViewController?.view,
          let hosting = findHostingView(in: root),
          let surface = hosting.surface as AnyObject?,
          let ivar = class_getInstanceVariable(type(of: surface), "_surfacePresenter")
    else { return nil }
    return object_getIvar(surface, ivar) as? NSObject
  }

  private static func findHostingView(in view: UIView) -> RCTSurfaceHostingView? {
    if let hosting = view as? RCTSurfaceHostingView { return hosting }
    for sub in view.subviews {
      if let hosting = findHostingView(in: sub) { return hosting }
    }
    return nil
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }

  private static func topViewController() -> UIViewController? {
    var top = keyWindow()?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}
