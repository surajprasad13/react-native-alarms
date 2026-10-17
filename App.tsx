import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmDemo } from './AlarmDemo';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AlarmDemo />
    </SafeAreaProvider>
  );
}

export default App;
