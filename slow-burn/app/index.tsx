import { Redirect } from 'expo-router';

/**
 * The root route only ever redirects; AuthGate in _layout.tsx decides where
 * the user actually belongs once auth state has resolved.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
