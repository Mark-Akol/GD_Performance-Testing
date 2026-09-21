import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { palette } from '@/theme/tokens';
import { needsOnboarding, useSession } from '@/store/session';

export default function RootLayout() {
  const init = useSession((s) => s.init);

  useEffect(() => init(), [init]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Single source of routing truth: where you land is derived from auth state
 * and onboarding completeness, never from an imperative navigate() scattered
 * through the sign-in screens.
 */
function AuthGate() {
  const session = useSession((s) => s.session);
  const goals = useSession((s) => s.goals);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return; // still restoring from the keychain

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';

    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (session && inAuth) {
      router.replace('/(tabs)');
      return;
    }
    // `goals === null` means the profile read has not landed yet; acting on it
    // would bounce a returning user through onboarding on every cold start.
    if (session && goals && needsOnboarding(goals) && !inOnboarding) {
      router.replace('/(onboarding)/about-you');
    }
  }, [session, goals, segments, router]);

  if (session === undefined) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={palette.ember} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.void },
        animation: 'fade',
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.void },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.void },
});
