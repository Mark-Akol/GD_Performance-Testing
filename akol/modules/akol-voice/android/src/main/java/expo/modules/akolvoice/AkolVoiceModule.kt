package expo.modules.akolvoice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentValues
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Voice alarms on Android. A notification channel's sound can only be set when the channel is
 * created, and it must be a file the system can read, so each recording is published to the
 * shared Notifications folder and gets a channel of its own.
 */
class AkolVoiceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Akol isn't ready yet")

  private val manager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("AkolVoice")

    /** Returns false on Android 9 and older, where Akol falls back to the built-in voice. */
    AsyncFunction("createVoiceChannel") { channelId: String, name: String, fileUri: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        false
      } else {
        val path = Uri.parse(fileUri).path ?: throw IllegalArgumentException("Not a file: $fileUri")
        val sound = publishSound(File(path), channelId)
        val attributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
        val channel = NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Plays a recorded voice when an alarm task still isn't done."
          setSound(sound, attributes)
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 600, 300, 600, 300, 600)
          setBypassDnd(true)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
        true
      }
    }

    AsyncFunction("deleteVoiceChannel") { channelId: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        manager.deleteNotificationChannel(channelId)
        context.contentResolver.delete(
          MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY),
          "${MediaStore.Audio.Media.DISPLAY_NAME}=?",
          arrayOf("$channelId.m4a")
        )
      }
      true
    }
  }

  private fun publishSound(file: File, name: String): Uri {
    val resolver = context.contentResolver
    val collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    val values = ContentValues().apply {
      put(MediaStore.Audio.Media.DISPLAY_NAME, "$name.m4a")
      put(MediaStore.Audio.Media.MIME_TYPE, "audio/mp4")
      put(MediaStore.Audio.Media.RELATIVE_PATH, "Notifications/Akol")
      put(MediaStore.Audio.Media.IS_NOTIFICATION, 1)
      put(MediaStore.Audio.Media.IS_PENDING, 1)
    }
    val uri = resolver.insert(collection, values) ?: throw IllegalStateException("Couldn't save the voice")
    resolver.openOutputStream(uri).use { out ->
      requireNotNull(out) { "Couldn't save the voice" }
      file.inputStream().use { it.copyTo(out) }
    }
    resolver.update(uri, ContentValues().apply { put(MediaStore.Audio.Media.IS_PENDING, 0) }, null, null)
    return uri
  }
}
