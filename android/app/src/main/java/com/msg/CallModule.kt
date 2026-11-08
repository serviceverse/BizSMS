package com.msg

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CallModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val callService = CallService(reactContext)

    override fun getName(): String = "CallModule"

    @ReactMethod
    fun startListening() {
        CallReceiver.isAppForeground = true
        callService.startListening()
    }

    @ReactMethod
    fun stopListening() {
        CallReceiver.isAppForeground = false
        callService.stopListening()
    }

    @ReactMethod
    fun getLastCallNumber(promise: Promise) {
        try {
            val listener = MyCallStateListener(reactApplicationContext) { _, _ -> }
            val number = listener.getLastCallNumber()
            promise.resolve(number ?: "Unknown")
        } catch (e: Exception) {
            promise.reject("CALL_LOG_ERROR", "Failed to get last call number", e)
        }
    }

    @ReactMethod
    fun getLastCallDetails(promise: Promise) {
        try {
            val listener = MyCallStateListener(reactApplicationContext) { _, _ -> }
            val details = listener.getLastCallDetails()
            if (details != null) {
                val map = Arguments.createMap()
                map.putString("number", details.first)
                map.putString("type", details.second)
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("CALL_LOG_ERROR", "Failed to get last call details", e)
        }
    }

    /**
     * Persist automation rules & profile directly to Android SharedPreferences
     * so that native CallReceiver can dispatch auto-replies even when the React Native app is closed/killed!
     */
    @ReactMethod
    fun syncNativeSettings(settingsJson: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("BizSMS_Native", Context.MODE_PRIVATE)
            prefs.edit().putString("settings_payload", settingsJson).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SYNC_FAILED", e.message, e)
        }
    }

    /**
     * Check if Android battery optimization is ignored so app can run in sleep/lock screen without OEM restrictions.
     */
    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
                powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
            } else {
                true
            }
            promise.resolve(isIgnored)
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    /**
     * Prompt user to disable battery optimization / enable unrestricted background activity.
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (fallbackErr: Exception) {
                promise.reject("BATTERY_SETTING_ERROR", fallbackErr.message, fallbackErr)
            }
        }
    }
}
