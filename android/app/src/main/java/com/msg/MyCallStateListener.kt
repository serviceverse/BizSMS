package com.msg

import android.content.Context
import android.provider.CallLog
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log

class MyCallStateListener(
        private val context: Context,
        private val onEvent: (String, String?) -> Unit
) : TelephonyCallback(), TelephonyCallback.CallStateListener {

    private var isRinging = false
    private var isAnswered = false

    override fun onCallStateChanged(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                isRinging = true
                Log.d("📞", "Phone ringing")
                onEvent("IncomingCall", null)
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                isAnswered = true
                Log.d("📞", "Call answered / offhook")
                onEvent("AnsweredCall", null)
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                Log.d("📞", "Call ended or missed (idle)")
                val lastCall = getLastCallDetails()
                val number = lastCall?.first
                val callType = lastCall?.second ?: "UNKNOWN"

                if (callType == "MISSED" || (isRinging && !isAnswered)) {
                    Log.d("📞", "Emitting CallMissed for $number")
                    onEvent("CallMissed", number)
                } else if (callType == "INCOMING" || isAnswered) {
                    Log.d("📞", "Emitting CallCompleted for $number")
                    onEvent("CallCompleted", number)
                }
                
                // Emitted for backward compatibility
                onEvent("MissedOrEndedCall", number)

                isRinging = false
                isAnswered = false
            }
        }
    }

    fun getLastCallNumber(): String? {
        return getLastCallDetails()?.first
    }

    fun getLastCallDetails(): Pair<String, String>? {
        return try {
            val resolver = context.contentResolver
            val cursor =
                    resolver.query(
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
                    Log.d("📞", "Last call: $number, type: $typeStr")
                    Pair(number, typeStr)
                } else null
            }
        } catch (e: Exception) {
            Log.e("📞", "Failed to read call log", e)
            null
        }
    }
}
