// Autolinking config for apps that install this package. The root android/ folder is
// the example app, so Android points at android-lib/ instead.
module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android-lib',
        packageImportPath: 'import com.reactnativealarms.RNAlarmsPackage;',
        packageInstance: 'new RNAlarmsPackage()',
      },
      ios: {
        podspecPath: './react-native-alarms.podspec',
      },
    },
  },
};
