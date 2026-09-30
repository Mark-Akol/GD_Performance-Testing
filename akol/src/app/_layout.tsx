import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ACTION_DONE,
  Notifications,
  configureNotifications,
  notificationsSupported,
  type ReminderData,
} from '../lib/notifications';
import { AkolProvider, useAkol } from '../lib/store';
import { colors } from '../theme';

/** Handles taps on reminders, including the "Mark done ✓" action button. */
function NotificationBridge() {
  const { dispatch, ready } = useAkol();

  useEffect(() => {
    configureNotifications().catch((e) => console.warn('Akol notifications', e));
  }, []);

  useEffect(() => {
    if (!notificationsSupported || !ready) return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as unknown as Partial<ReminderData>;
      if (!data?.taskId || !data.day) return;
      if (response.actionIdentifier === ACTION_DONE) {
        dispatch({ type: 'toggle', taskId: data.taskId, day: data.day, done: true });
      }
      router.navigate('/');
      Notifications.clearLastNotificationResponse();
    };
    handle(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [ready, dispatch]);

  return null;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { ready } = useAkol();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_400Regular_Italic,
  });
  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AkolProvider>
        <StatusBar style="light" />
        <Gate>
          {/* Inside the gate so a tapped reminder can navigate once the router is mounted. */}
          <NotificationBridge />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="member/[id]" />
            <Stack.Screen name="routine/[id]" />
            <Stack.Screen name="task" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="member-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </Gate>
      </AkolProvider>
    </SafeAreaProvider>
  );
}
