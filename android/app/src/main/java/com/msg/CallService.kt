package com.msg

import android.content.Context
import android.telephony.TelephonyManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallService(private val reactContext: ReactApplicationContext) {
    private var telephonyManager: TelephonyManager? = null
    private var callStateListener: MyCallStateListener? = null

    fun startListening() {
        telephonyManager =
            reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        callStateListener = MyCallStateListener(reactContext) { event, number ->   // 👈 pass context
            Log.d("📞 Event", "Event: $event Number: $number")
            sendEvent(event, number ?: "Unknown")
        }

        telephonyManager?.registerTelephonyCallback(
            reactContext.mainExecutor,
            callStateListener as MyCallStateListener
        )
    }

    fun stopListening() {
        callStateListener?.let {
            telephonyManager?.unregisterTelephonyCallback(it)
        }
    }

    private fun sendEvent(event: String, number: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, number)
    }
}
