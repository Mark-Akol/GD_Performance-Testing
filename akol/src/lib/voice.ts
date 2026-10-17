import { RecordingPresets, type RecordingOptions } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { AkolVoice } from '../../modules/akol-voice';
import type { VoiceClip } from './types';

/**
 * Voice alarms: a parent records "Hey Ra, it's time to go" and an alarm's repeat rings play it.
 *
 * iOS plays a notification sound by file name from the app's Library/Sounds folder, so the
 * recording is saved there as linear PCM .wav (the formats iOS accepts, up to 30 seconds).
 * Android plays a channel's sound, fixed when the channel is made, so each recording gets its
 * own channel through the small native module in `modules/akol-voice`.
 */

/** Akol's own voice, bundled with the app (see the expo-notifications `sounds` in app.json). */
export const DEFAULT_VOICE_SOUND = 'akol_time_to_go.wav';
export const MAX_VOICE_SECONDS = 10;

/** Recording works where the voice can then be played by a notification. */
export const voiceRecordingSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export const VOICE_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: 'lpcm',
    sampleRate: 22050,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

function soundsDirectory(): Directory {
  // Library/Caches → Library/Sounds
  const dir = new Directory(Paths.cache.parentDirectory, 'Sounds');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function voicesDirectory(): Directory {
  const dir = new Directory(Paths.document, 'voices');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Keep a fresh recording as `ownerId`'s voice (a member id, or 'family'). */
export async function saveVoice(ownerId: string, ownerName: string, recordingUri: string): Promise<VoiceClip> {
  const recordedAt = Date.now();
  const base = `akol_voice_${safe(ownerId)}_${recordedAt}`;
  const recording = new File(recordingUri);

  if (Platform.OS === 'ios') {
    const file = new File(soundsDirectory(), `${base}.wav`);
    await recording.copy(file);
    return { sound: file.name, uri: file.uri, recordedAt };
  }

  const file = new File(voicesDirectory(), `${base}${recording.extension || '.m4a'}`);
  await recording.copy(file);
  const channelId = base.replace(/_/g, '-');
  const made = await AkolVoice?.createVoiceChannel(channelId, `Voice: ${ownerName}`, file.uri).catch((e) => {
    console.warn('Akol: could not make a voice channel', e);
    return false;
  });
  return { sound: file.name, uri: file.uri, channelId: made ? channelId : undefined, recordedAt };
}

export async function deleteVoice(clip: VoiceClip): Promise<void> {
  try {
    const file = new File(clip.uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Akol: could not delete a voice', e);
  }
  if (clip.channelId) await AkolVoice?.deleteVoiceChannel(clip.channelId).catch(() => {});
}
