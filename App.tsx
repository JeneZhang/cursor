import { StatusBar } from 'expo-status-bar';

import { RootNavigation } from './src/navigation';

export default function App() {
  return (
    <>
      <RootNavigation />
      <StatusBar style="dark" />
    </>
  );
}
