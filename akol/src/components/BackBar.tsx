import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '../theme';
import { tap } from './ui';

export function goBack(fallback: '/' | '/routines' | '/family' | '/settings' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function BackBar({
  right,
  icon = 'chevron-back',
  fallback,
}: {
  right?: ReactNode;
  icon?: 'chevron-back' | 'close';
  fallback?: Parameters<typeof goBack>[0];
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={icon === 'close' ? 'Close' : 'Back'}
        hitSlop={12}
        onPress={() => {
          tap();
          goBack(fallback);
        }}
        style={styles.btn}
      >
        <Ionicons name={icon} size={22} color={colors.gold} />
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
