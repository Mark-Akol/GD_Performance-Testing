import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

interface AkolVoiceNative {
  createVoiceChannel(channelId: string, name: string, fileUri: string): Promise<boolean>;
  deleteVoiceChannel(channelId: string): Promise<boolean>;
}

/** Null on iOS, on the web and in Expo Go, where the module isn't built in. */
export const AkolVoice: AkolVoiceNative | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<AkolVoiceNative>('AkolVoice') : null;
