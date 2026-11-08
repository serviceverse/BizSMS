package com.msg

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.CallLog
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CallReceiver : BroadcastReceiver() {

    companion object {
        var isAppForeground = false
        private var wasRinging = false
        private var wasAnswered = false
        private var lastProcessedNumber: String? = null
        private var lastProcessedTime: Long = 0
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent == null || context == null) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                wasRinging = true
                val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                Log.d("📞 BizSMS Receiver", "Incoming call ringing: $number")
            }

            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                wasAnswered = true
                Log.d("📞 BizSMS Receiver", "Call answered / offhook")
            }

            TelephonyManager.EXTRA_STATE_IDLE -> {
                Log.d("📞 BizSMS Receiver", "Call idle / ended (Phone locked/asleep: ${!isAppForeground})")
                val isMissed = wasRinging && !wasAnswered
                val isAnswered = wasAnswered

                // Reset state flags for next call
                wasRinging = false
                wasAnswered = false

                // If React Native app is active in foreground, let the JS hook handle it to show in-app logs
                if (isAppForeground) {
                    Log.d("📞 BizSMS Receiver", "App is active in foreground; letting React Native listener handle.")
                    return
                }

                // When app is in background, phone is locked, or screen is off:
                // Use goAsync() and a Partial WakeLock so the Android CPU does not sleep
                // before CallLog is queried and carrier SMS is dispatched!
                val pendingResult = goAsync()
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                val wakeLock = powerManager?.newWakeLock(
                    android.os.PowerManager.PARTIAL_WAKE_LOCK,
                    "BizSMS:CallReceiverWakeLock"
                )
                try {
                    wakeLock?.acquire(10000) // 10 seconds max
                } catch (e: Exception) {
                    Log.w("📞 BizSMS Receiver", "WakeLock acquire notice", e)
                }

                Thread {
                    try {
                        Thread.sleep(1200) // 1.2 second delay to ensure CallLog is written by system
                        handleCallEnded(context, isMissed, isAnswered)
                    } catch (e: Exception) {
                        Log.e("📞 BizSMS Receiver", "Error in background handler", e)
                    } finally {
                        try {
                            if (wakeLock != null && wakeLock.isHeld) {
                                wakeLock.release()
                            }
                        } catch (e: Exception) {}
                        try {
                            pendingResult.finish()
                        } catch (e: Exception) {}
                    }
                }.start()
            }
        }
    }

    private fun handleCallEnded(context: Context, isMissedCandidate: Boolean, isAnsweredCandidate: Boolean) {
        val lastCall = getLastCallDetails(context) ?: return
        val rawNumber = lastCall.first
        val callType = lastCall.second

        val cleanNumber = rawNumber.replace(Regex("[^0-9+]"), "")
        if (cleanNumber.isBlank()) return

        // Prevent duplicate processing of the exact same call event within 4 seconds
        val now = System.currentTimeMillis()
        if (cleanNumber == lastProcessedNumber && (now - lastProcessedTime) < 4000) {
            Log.d("📞 BizSMS Receiver", "Duplicate event detected for $cleanNumber. Skipping.")
            return
        }
        lastProcessedNumber = cleanNumber
        lastProcessedTime = now

        // Determine if it was missed or completed
        val isMissed = callType == "MISSED" || callType == "REJECTED" || isMissedCandidate
        val isCompleted = callType == "INCOMING" || isAnsweredCandidate

        // Read stored settings from SharedPreferences
        val prefs = context.getSharedPreferences("BizSMS_Native", Context.MODE_PRIVATE)
        val payloadStr = prefs.getString("settings_payload", null) ?: return

        try {
            val json = JSONObject(payloadStr)
            val automations = json.optJSONObject("automations") ?: return
            val profile = json.optJSONObject("profile") ?: JSONObject()
            val blockedContacts = json.optJSONArray("blockedNumbers") ?: JSONArray()

            // 1. Check if the specific trigger is enabled
            val missedEnabled = automations.optBoolean("missedCallEnabled", true)
            val callEndedEnabled = automations.optBoolean("callEndedEnabled", true)

            if (isMissed && !missedEnabled) {
                Log.d("📞 BizSMS Receiver", "Missed call responder is disabled.")
                return
            }
            if (!isMissed && isCompleted && !callEndedEnabled) {
                Log.d("📞 BizSMS Receiver", "Post-call responder is disabled.")
                return
            }

            // 2. Check Blocklist / Excluded numbers
            for (i in 0 until blockedContacts.length()) {
                val blockedNum = blockedContacts.getString(i).replace(Regex("[^0-9+]"), "")
                if (blockedNum.isNotBlank() && (cleanNumber.endsWith(blockedNum.takeLast(10)) || cleanNumber == blockedNum)) {
                    Log.d("📞 BizSMS Receiver", "Caller $cleanNumber is in Blocked/VIP list. Skipping.")
                    return
                }
            }

            // 3. Check Working Hours
            val workingHoursOnly = automations.optBoolean("workingHoursOnly", false)
            if (workingHoursOnly) {
                val start = automations.optString("workingHoursStart", "09:00")
                val end = automations.optString("workingHoursEnd", "20:00")
                if (!isWithinHours(start, end)) {
                    Log.d("📞 BizSMS Receiver", "Outside working hours. Skipping.")
                    return
                }
            }

            // 4. Anti-Spam / Rate-limiting check
            val antiSpamHours = automations.optInt("antiSpamHours", 24)
            val cooldownMs = antiSpamHours.toLong() * 60 * 60 * 1000
            val lastSentKey = "last_sent_$cleanNumber"
            val lastSentTimestamp = prefs.getLong(lastSentKey, 0L)
            if (now - lastSentTimestamp < cooldownMs) {
                Log.d("📞 BizSMS Receiver", "Already sent message to $cleanNumber within ${antiSpamHours}h cooldown. Skipping.")
                return
            }

            // 5. Select template
            val rawTemplate = if (isMissed) {
                automations.optString("missedCallTemplate", "")
            } else {
                automations.optString("callEndedTemplate", "")
            }

            if (rawTemplate.isBlank()) return

            // 6. Replace Dynamic Personalization Tags
            var finalMessage = rawTemplate
                .replace("{name}", "Valued Customer", ignoreCase = true)
                .replace("{business_name}", profile.optString("businessName", "Our Business"), ignoreCase = true)
                .replace("{owner_name}", profile.optString("ownerName", ""), ignoreCase = true)
                .replace("{phone}", profile.optString("phone", ""), ignoreCase = true)
                .replace("{whatsapp}", profile.optString("whatsapp", ""), ignoreCase = true)
                .replace("{maps_link}", profile.optString("mapsLink", ""), ignoreCase = true)
                .replace("{catalog_link}", profile.optString("catalogLink", ""), ignoreCase = true)
                .replace("{tagline}", profile.optString("tagline", ""), ignoreCase = true)

            // 7. Dispatch SMS
            val selectedSimId = automations.optInt("selectedSimId", -1)
            sendCarrierSms(context, cleanNumber, finalMessage, selectedSimId)

            // Update Anti-Spam timestamp in SharedPreferences
            prefs.edit().putLong(lastSentKey, now).apply()

            // 8. Show notification that auto-reply was dispatched
            showNotification(context, isMissed, cleanNumber)

            Log.d("📞 BizSMS Receiver", "✅ Successfully dispatched native auto-reply to $cleanNumber")

        } catch (e: Exception) {
            Log.e("📞 BizSMS Receiver", "Error executing auto-reply", e)
        }
    }

    private fun isWithinHours(start: String, end: String): Boolean {
        return try {
            val cal = Calendar.getInstance()
            val currentMinutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

            val startParts = start.split(":").map { it.toInt() }
            val endParts = end.split(":").map { it.toInt() }

            val startMinutes = startParts[0] * 60 + startParts[1]
            val endMinutes = endParts[0] * 60 + endParts[1]

            currentMinutes in startMinutes..endMinutes
        } catch (e: Exception) {
            true
        }
    }

    private fun sendCarrierSms(context: Context, phoneNumber: String, message: String, subId: Int) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            Log.w("📞 BizSMS Receiver", "SEND_SMS permission not granted")
            return
        }

        val smsManager: SmsManager = if (subId >= 0) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getSmsManagerForSubscriptionId(subId)
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                context.getSystemService(SmsManager::class.java) ?: @Suppress("DEPRECATION") SmsManager.getDefault()
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        }

        val parts = smsManager.divideMessage(message)
        if (parts.size > 1) {
            smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
        } else {
            smsManager.sendTextMessage(phoneNumber, null, message, null, null)
        }
    }

    private fun showNotification(context: Context, isMissed: Boolean, number: String) {
        try {
            val channelId = "bizsms_activity"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "BizSMS Activity", NotificationManager.IMPORTANCE_LOW)
                channel.description = "Notifies when automated replies are dispatched"
                notificationManager.createNotificationChannel(channel)
            }

            val title = if (isMissed) "BizSMS: Missed Call Auto-Reply Sent" else "BizSMS: Post-Call Card Sent"
            val body = "Dispatched automated response to $number"

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .build()

            notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
        } catch (e: Exception) {
            Log.e("📞 BizSMS Receiver", "Failed to show notification", e)
        }
    }

    private fun getLastCallDetails(context: Context): Pair<String, String>? {
        return try {
            val resolver = context.contentResolver
            val cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val typeStr = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                        else -> "OTHER"
                    }
                    Pair(number, typeStr)
                } else null
            }
        } catch (e: Exception) {
            Log.e("📞 BizSMS Receiver", "Failed to read call log", e)
            null
        }
    }
}
