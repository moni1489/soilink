import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Warning: ']);

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f5f7f9' } }}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
    </Stack>
  );
}
