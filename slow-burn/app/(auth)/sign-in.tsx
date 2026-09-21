import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { palette, radius, spacing } from '@/theme/tokens';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(err.message);
    setBusy(false);
    // On success, AuthGate redirects — no navigation call needed here.
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <Text variant="eyebrow" tone="ember">
            SLOW BURN
          </Text>
          <Text variant="title" style={styles.headline}>
            Consistency, witnessed.
          </Text>
          <Text variant="body" tone="secondary">
            Your day, planned. Your circle, watching.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />

          {error ? (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          ) : null}

          <Button
            label="Sign in"
            onPress={submit}
            loading={busy}
            disabled={!email.trim() || password.length === 0}
          />

          <Link href="/(auth)/sign-up" style={styles.link}>
            <Text variant="caption" tone="secondary">
              No account yet? <Text variant="caption" tone="ember">Create one</Text>
            </Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
}

export function Field({ label, style, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="eyebrow" tone="tertiary">
        {label.toUpperCase()}
      </Text>
      <TextInput
        {...rest}
        autoCapitalize="none"
        placeholderTextColor={palette.textTertiary}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' },
  hero: { gap: spacing.sm, marginBottom: spacing.xxxl },
  headline: { marginTop: spacing.sm },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    color: palette.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 50,
  },
  link: { alignSelf: 'center', marginTop: spacing.sm },
});
