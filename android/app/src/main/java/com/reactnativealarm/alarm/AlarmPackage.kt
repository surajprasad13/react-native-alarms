package com.alarm

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AlarmPackage : BaseReactPackage() {
  override fun getModule(name: String, ctx: ReactApplicationContext): NativeModule? =
    if (name == AlarmModule.NAME) AlarmModule(ctx) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      AlarmModule.NAME to ReactModuleInfo(
        AlarmModule.NAME, AlarmModule.NAME,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        false  // isTurboModule
      )
    )
  }
}