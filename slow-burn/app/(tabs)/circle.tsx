import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { createCircle, fetchCircles, fetchStandings, joinCircle, sendNudge } from '@/lib/repo';
import { useSession } from '@/store/session';
import { palette, radius, spacing } from '@/theme/tokens';
import type { Circle, CircleStanding } from '@/types/models';

export default function CircleTab() {
  const session = useSession((s) => s.session);

  const [circles, setCircles] = useState<Circle[]>([]);
  const [active, setActive] = useState<Circle | null>(null);
  const [standings, setStandings] = useState<CircleStanding[]>([]);
  const [code, setCode] = useState('');
  const [newCircleName, setNewCircleName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCircles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCircles();
      setCircles(rows);
      setActive((current) => rows.find((c) => c.id === current?.id) ?? rows[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your circles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCircles();
  }, [loadCircles]);

  useEffect(() => {
    if (!active) {
      setStandings([]);
      return;
    }
    void fetchStandings(active.id)
      .then(setStandings)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not load standings'),
      );
  }, [active]);

  // Deliberately an inline field rather than Alert.prompt: that API exists only
  // on iOS and silently does nothing on Android, which would have shipped as a
  // dead button on half the install base.
  const handleCreate = async () => {
    const name = newCircleName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await createCircle(name);
      setNewCircleName('');
      await loadCircles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that circle');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (code.trim().length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await joinCircle(code.trim().toUpperCase());
      setCode('');
      await loadCircles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work');
    } finally {
      setBusy(false);
    }
  };

  const handleNudge = async (target: CircleStanding) => {
    if (!session || !active || target.userId === session.user.id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendNudge({
        circleId: active.id,
        fromUserId: session.user.id,
        toUserId: target.userId,
        // Cheer when they are doing well, poke when they are not. Same button,
        // read from context — the app never makes you pick a tone.
        kind: target.score >= 70 ? 'cheer' : 'poke',
      });
      Alert.alert('Sent', `${target.displayName} will hear about it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that');
    }
  };

  const shareInvite = async () => {
    if (!active) return;
    await Share.share({
      message: `Join my Slow Burn circle "${active.name}". Invite code: ${active.inviteCode}`,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCircles} tintColor={palette.ember} />
        }
      >
        <View style={styles.header}>
          <Text variant="eyebrow" tone="ember">
            ACCOUNTABILITY
          </Text>
          <Text variant="title">Your circle</Text>
        </View>

        {error ? (
          <Text variant="caption" tone="danger" style={styles.block}>
            {error}
          </Text>
        ) : null}

        {circles.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {circles.map((circle) => (
              <Pressable
                key={circle.id}
                onPress={() => setActive(circle)}
                style={[styles.chip, active?.id === circle.id && styles.chipOn]}
              >
                <Text variant="caption" tone={active?.id === circle.id ? 'primary' : 'secondary'}>
                  {circle.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {active ? (
          <>
            <Card style={styles.block}>
              <View style={styles.inviteRow}>
                <View style={styles.inviteText}>
                  <Text variant="eyebrow" tone="tertiary">
                    INVITE CODE
                  </Text>
                  <Text variant="heading" tone="brass" style={styles.code}>
                    {active.inviteCode}
                  </Text>
                </View>
                <Pressable
                  onPress={shareInvite}
                  accessibilityRole="button"
                  accessibilityLabel="Share invite code"
                  style={styles.shareButton}
                >
                  <Ionicons name="share-outline" size={20} color={palette.textPrimary} />
                </Pressable>
              </View>
            </Card>

            <Text variant="eyebrow" tone="tertiary" style={styles.section}>
              TODAY
            </Text>

            <View style={styles.list}>
              {standings.map((member, index) => {
                const isYou = member.userId === session?.user.id;
                return (
                  <Card key={member.userId} style={styles.member} highlighted={index === 0}>
                    <View style={styles.rank}>
                      <Text variant="caption" tone={index === 0 ? 'brass' : 'tertiary'}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.memberBody}>
                      <Text variant="label">
                        {member.displayName}
                        {isYou ? ' (you)' : ''}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {member.completed}/{member.total} done
                        {member.streak > 0 ? ` · ${member.streak} day streak` : ''}
                      </Text>
                    </View>

                    <Text variant="heading" tone={member.score >= 70 ? 'ember' : 'tertiary'}>
                      {member.score}
                    </Text>

                    {!isYou ? (
                      <Pressable
                        onPress={() => handleNudge(member)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Nudge ${member.displayName}`}
                        style={styles.nudge}
                      >
                        <Ionicons
                          name={member.score >= 70 ? 'hand-left-outline' : 'notifications-outline'}
                          size={18}
                          color={palette.textSecondary}
                        />
                      </Pressable>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          </>
        ) : (
          <Card style={styles.block}>
            <Text variant="heading">Nobody is watching yet</Text>
            <Text variant="body" tone="secondary" style={styles.blurb}>
              A circle is two to twelve people who can see each other&apos;s daily score —
              and nothing else. No weights, no meals, no missed prompts.
            </Text>
          </Card>
        )}

        <Text variant="eyebrow" tone="tertiary" style={styles.section}>
          JOIN WITH A CODE
        </Text>
        <View style={styles.joinRow}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="ABC234"
            placeholderTextColor={palette.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={styles.codeInput}
            accessibilityLabel="Circle invite code"
          />
          <View style={styles.joinButton}>
            <Button label="Join" onPress={handleJoin} disabled={code.trim().length < 4} full={false} />
          </View>
        </View>

        <Text variant="eyebrow" tone="tertiary" style={styles.section}>
          OR START ONE
        </Text>
        <View style={styles.joinRow}>
          <TextInput
            value={newCircleName}
            onChangeText={setNewCircleName}
            placeholder="Circle name"
            placeholderTextColor={palette.textTertiary}
            maxLength={40}
            style={styles.nameInput}
            accessibilityLabel="New circle name"
          />
          <View style={styles.joinButton}>
            <Button
              label="Create"
              onPress={handleCreate}
              variant="quiet"
              loading={busy}
              disabled={!newCircleName.trim()}
              full={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.void },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm },
  block: { marginTop: spacing.lg },
  blurb: { marginTop: spacing.sm },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  chips: { marginTop: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    marginRight: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  chipOn: { backgroundColor: palette.surfaceRaised, borderColor: palette.emberDim },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteText: { gap: spacing.xs },
  code: { letterSpacing: 4 },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceRaised,
  },
  list: { gap: spacing.sm },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { width: 20, alignItems: 'center' },
  memberBody: { flex: 1, gap: 2 },
  nudge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceRaised,
  },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeInput: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    color: palette.textPrimary,
    fontSize: 18,
    letterSpacing: 4,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  nameInput: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    color: palette.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  joinButton: { minWidth: 100 },
});
