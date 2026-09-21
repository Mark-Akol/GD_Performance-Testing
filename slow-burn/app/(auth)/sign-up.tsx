import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Field } from './sign-in';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Read by the handle_new_user trigger to seed the profile.
      options: { data: { display_name: displayName.trim() } },
    });

    if (err) {
      setError(err.message);
    } else if (!data.session) {
      // Email confirmation is on in the Supabase project: there is no session
      // yet, so tell the user to check their inbox rather than leaving them on
      // a form that looks like it failed.
      setSent(true);
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View style={styles.centred}>
          <Text variant="eyebrow" tone="ember">
            ALMOST THERE
          </Text>
          <Text variant="title">Check your email</Text>
          <Text variant="body" tone="secondary">
            We sent a confirmation link to {email.trim()}. Open it, then sign in.
          </Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            <Text variant="label" tone="ember">
              Back to sign in
            </Text>
          </Link>
        </View>
      </Screen>
    );
  }

  const passwordTooShort = password.length > 0 && password.length < 8;

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
          <Text variant="title">Start the burn</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            textContentType="name"
          />
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
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {passwordTooShort ? (
            <Text variant="caption" tone="tertiary">
              At least 8 characters.
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          ) : null}

          <Button
            label="Create account"
            onPress={submit}
            loading={busy}
            disabled={!email.trim() || password.length < 8 || !displayName.trim()}
          />

          <Link href="/(auth)/sign-in" style={styles.link}>
            <Text variant="caption" tone="secondary">
              Already have an account? <Text variant="caption" tone="ember">Sign in</Text>
            </Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' },
  centred: { flex: 1, justifyContent: 'center', gap: spacing.md },
  hero: { gap: spacing.sm, marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  link: { alignSelf: 'center', marginTop: spacing.sm },
});
