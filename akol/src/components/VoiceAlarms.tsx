import { Ionicons } from '@expo/vector-icons';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { sendTestVoiceAlarm } from '../lib/notifications';
import { FAMILY_ID } from '../lib/schedule';
import { useAkol } from '../lib/store';
import { MAX_VOICE_SECONDS, VOICE_RECORDING, deleteVoice, saveVoice, voiceRecordingSupported } from '../lib/voice';
import { colors, fonts, space } from '../theme';
import { Avatar } from './Avatar';
import { Card, Dim, GhostButton, InkButton, confirm } from './ui';

const DEFAULT_VOICE = require('../../assets/sounds/akol_time_to_go.wav');

const scriptFor = (ownerId: string, name: string) =>
  ownerId === FAMILY_ID ? 'Hey everyone, it’s time to go!' : `Hey ${name}, it’s time to go!`;

/**
 * Record a voice for each person (and one for the whole family). When an alarm task still
 * isn't ticked a few minutes after its time, the repeat rings play that voice.
 */
export function VoiceAlarmsCard() {
  const { state, dispatch } = useAkol();
  const voices = state.settings.voices ?? {};
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const rec = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(null);

  /** Who is being recorded, and the take waiting to be kept or redone. */
  const [owner, setOwner] = useState<string | null>(null);
  const [take, setTake] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const owners = [
    ...state.members.map((m) => ({ id: m.id, name: m.name })),
    { id: FAMILY_ID, name: 'Whole family' },
  ];
  const nameOf = (id: string) => owners.find((o) => o.id === id)?.name ?? '';

  const play = (source: string | number) => {
    player.replace(typeof source === 'string' ? { uri: source } : source);
    player.play();
  };

  const stop = async () => {
    if (!recorder.isRecording) return;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setTake(recorder.uri);
    if (recorder.uri) play(recorder.uri);
  };

  // Stop on the time limit; iOS ignores notification sounds longer than 30 seconds.
  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_VOICE_SECONDS * 1000) stop();
  }, [rec.isRecording, rec.durationMillis]);

  const start = async (id: string) => {
    setMsg(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      confirm('Microphone is off', 'Allow the microphone for Akol in your phone settings to record a voice.', 'Open Settings', () =>
        Linking.openSettings(),
      );
      return;
    }
    player.pause();
    setOwner(id);
    setTake(null);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const keep = async () => {
    if (!owner || !take) return;
    setBusy(true);
    try {
      const clip = await saveVoice(owner, nameOf(owner), take);
      const old = voices[owner];
      dispatch({ type: 'settings', patch: { voices: { ...voices, [owner]: clip } } });
      if (old) deleteVoice(old);
      setOwner(null);
      setTake(null);
      setMsg('Saved. Alarm repeats for them now play your voice.');
    } catch (e) {
      setMsg(`Couldn’t save the voice: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    const clip = voices[id];
    if (!clip) return;
    confirm('Delete this voice?', `${nameOf(id)}’s alarms go back to Akol’s voice.`, 'Delete', () => {
      const { [id]: _gone, ...rest } = voices;
      dispatch({ type: 'settings', patch: { voices: rest } });
      deleteVoice(clip);
    });
  };

  return (
    <Card style={{ gap: space.md }}>
      <Dim style={styles.small}>
        An item set to Alarm rings on time. If it still isn’t ticked 3 minutes later, the repeats play a voice. Record
        your own, or keep Akol’s.
      </Dim>

      <View style={styles.row}>
        <View style={styles.badge}>
          <Ionicons name="volume-high" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Akol’s voice</Text>
          <Dim style={styles.small}>“Hey! It’s time to go. Let’s go, let’s go!”</Dim>
        </View>
        <IconButton icon="play" label="Play Akol’s voice" onPress={() => play(DEFAULT_VOICE)} />
      </View>
      {voiceRecordingSupported && (
        <GhostButton
          label="Test a voice alarm in 5 seconds"
          icon={<Ionicons name="alarm-outline" size={16} color={colors.ink} />}
          onPress={async () => {
            const mine = state.settings.meId ? voices[state.settings.meId] : undefined;
            const ok = await sendTestVoiceAlarm(mine ?? 'default', nameOf(state.settings.meId ?? '') || 'Akol');
            setMsg(ok ? 'Lock your phone. It rings in 5 seconds.' : 'Turn on notifications for Akol first.');
          }}
        />
      )}

      {!voiceRecordingSupported ? (
        <Dim style={styles.small}>Record your own voices in the Akol app on your phone.</Dim>
      ) : (
        owners.map((o) => {
          const clip = voices[o.id];
          const active = owner === o.id;
          return (
            <View key={o.id} style={[styles.block, active && styles.blockActive]}>
              <View style={styles.row}>
                <Avatar memberId={o.id} member={state.members.find((m) => m.id === o.id)} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{o.name}</Text>
                  <Dim style={styles.small}>{clip ? 'Your recording' : 'Akol’s voice'}</Dim>
                </View>
                {clip && !active && (
                  <>
                    <IconButton icon="play" label={`Play ${o.name}’s voice`} onPress={() => play(clip.uri)} />
                    <IconButton icon="trash-outline" label={`Delete ${o.name}’s voice`} onPress={() => remove(o.id)} />
                  </>
                )}
                {!active && (
                  <IconButton
                    icon="mic"
                    label={`Record a voice for ${o.name}`}
                    onPress={() => start(o.id)}
                    disabled={rec.isRecording}
                  />
                )}
              </View>

              {active && (
                <View style={{ gap: space.md }}>
                  {rec.isRecording ? (
                    <>
                      <Text style={styles.script}>Say: “{scriptFor(o.id, o.name)}”</Text>
                      <View style={styles.meter}>
                        <View
                          style={[
                            styles.meterFill,
                            { width: `${Math.min(100, (rec.durationMillis / (MAX_VOICE_SECONDS * 1000)) * 100)}%` },
                          ]}
                        />
                      </View>
                      <InkButton
                        label={`Stop · ${Math.max(0, MAX_VOICE_SECONDS - Math.floor(rec.durationMillis / 1000))}s left`}
                        onPress={stop}
                      />
                    </>
                  ) : take ? (
                    <>
                      <InkButton label={busy ? 'Saving…' : 'Use this voice'} onPress={keep} disabled={busy} />
                      <View style={styles.pair}>
                        <GhostButton label="Play" onPress={() => play(take)} style={{ flex: 1 }} />
                        <GhostButton label="Redo" onPress={() => start(o.id)} style={{ flex: 1 }} />
                      </View>
                      <GhostButton
                        label="Cancel"
                        tone="plain"
                        onPress={() => {
                          setOwner(null);
                          setTake(null);
                        }}
                      />
                    </>
                  ) : (
                    <Dim style={styles.small}>Getting the microphone ready…</Dim>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
      {msg && <Dim style={styles.small}>{msg}</Dim>}
      {voiceRecordingSupported && (
        <Dim style={styles.tiny}>
          Recordings stay on this phone. Record on each phone that should play them. On iPhone, a phone on silent
          vibrates instead.
        </Dim>
      )}
    </Card>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  small: { fontSize: 13, lineHeight: 19 },
  tiny: { fontSize: 11, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pair: { flexDirection: 'row', gap: space.sm },
  block: { gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  blockActive: { paddingBottom: space.sm },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  script: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.5, color: colors.text, textTransform: 'uppercase' },
  meter: { height: 4, backgroundColor: colors.hairline },
  meterFill: { height: 4, backgroundColor: colors.text },
});
