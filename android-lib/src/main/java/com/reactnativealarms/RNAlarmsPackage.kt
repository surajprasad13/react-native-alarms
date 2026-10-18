package com.reactnativealarms

import com.alarm.AlarmPackage
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

// Autolinking entry point: the RN CLI only detects ReactPackage classes located inside
// android-lib/, while the real implementation lives in the example app's source tree.
class RNAlarmsPackage : BaseReactPackage() {
  private val impl = AlarmPackage()

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    impl.getModule(name, reactContext)

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = impl.getReactModuleInfoProvider()
}
