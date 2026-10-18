require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-alarms'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.authors      = package['author']['name']
  s.homepage     = package['repository']['url']
  s.source       = { :git => package['repository']['url'], :tag => "v#{s.version}" }

  s.platforms    = { :ios => '15.0' }
  s.swift_version = '5.9'
  s.source_files = 'ios/alarm/**/*.{h,m,mm,swift}'
  s.frameworks   = 'UserNotifications', 'UIKit'

  install_modules_dependencies(s)
end
