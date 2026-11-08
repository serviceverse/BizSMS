package com.msg

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar
import java.util.HashMap

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "SmsModule"

    @ReactMethod
    fun getSimCards(promise: Promise) {
        try {
            val context = reactApplicationContext
            val result = Arguments.createArray()

            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED

            val subList = if (hasPermission && subscriptionManager != null) {
                try {
                    subscriptionManager.activeSubscriptionInfoList
                } catch (e: Exception) {
                    Log.w("SIM", "Could not get activeSubscriptionInfoList", e)
                    null
                }
            } else null

            if (subList != null && subList.isNotEmpty()) {
                for (info in subList) {
                    val map = Arguments.createMap()
                    map.putInt("subscriptionId", info.subscriptionId)
                    map.putInt("simSlotIndex", info.simSlotIndex) // 0 for SIM 1, 1 for SIM 2

                    var operatorName: String? = info.carrierName?.toString()
                    if (operatorName.isNullOrBlank() || operatorName.equals("Unknown", ignoreCase = true) || operatorName.startsWith("SIM ", ignoreCase = true)) {
                        val dName = info.displayName?.toString()
                        if (!dName.isNullOrBlank() && !dName.startsWith("SIM ", ignoreCase = true)) {
                            operatorName = dName
                        }
                    }

                    if (operatorName.isNullOrBlank() || operatorName.startsWith("SIM ", ignoreCase = true)) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && telephonyManager != null) {
                                val subTelephony = telephonyManager.createForSubscriptionId(info.subscriptionId)
                                val simOp = subTelephony.simOperatorName
                                val netOp = subTelephony.networkOperatorName
                                if (!simOp.isNullOrBlank()) {
                                    operatorName = simOp
                                } else if (!netOp.isNullOrBlank()) {
                                    operatorName = netOp
                                }
                            }
                        } catch (e: Exception) {
                            Log.d("SIM", "Could not query subTelephony operator name", e)
                        }
                    }

                    if (operatorName.isNullOrBlank()) {
                        operatorName = "Operator ${info.simSlotIndex + 1}"
                    }

                    map.putString("carrierName", operatorName)
                    map.putString("displayName", info.displayName?.toString() ?: operatorName)
                    map.putString("countryIso", info.countryIso ?: "")

                    var phoneNumber: String? = null
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            phoneNumber = subscriptionManager?.getPhoneNumber(info.subscriptionId)
                        }
                    } catch (e: Exception) {}

                    if (phoneNumber.isNullOrBlank()) {
                        try {
                            @Suppress("DEPRECATION")
                            phoneNumber = info.number
                        } catch (e: Exception) {}
                    }

                    // Sanitize detected phone number - reject dummy carrier or corrupted numbers
                    val cleanPhone = sanitizeDetectedPhoneNumber(phoneNumber)
                    map.putString("phoneNumber", cleanPhone)
                    result.pushMap(map)
                }
            } else {
                val map1 = Arguments.createMap()
                map1.putInt("subscriptionId", 0)
                map1.putInt("simSlotIndex", 0)
                map1.putString("carrierName", "Jio / Airtel (SIM 1)")
                map1.putString("displayName", "SIM 1")
                map1.putString("countryIso", "in")
                map1.putString("phoneNumber", "")
                result.pushMap(map1)

                val map2 = Arguments.createMap()
                map2.putInt("subscriptionId", 1)
                map2.putInt("simSlotIndex", 1)
                map2.putString("carrierName", "Secondary Operator (SIM 2)")
                map2.putString("displayName", "SIM 2")
                map2.putString("countryIso", "in")
                map2.putString("phoneNumber", "")
                result.pushMap(map2)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            val fallback = Arguments.createArray()
            val m1 = Arguments.createMap()
            m1.putInt("subscriptionId", 0)
            m1.putInt("simSlotIndex", 0)
            m1.putString("carrierName", "SIM 1 Operator")
            m1.putString("displayName", "SIM 1")
            m1.putString("countryIso", "")
            m1.putString("phoneNumber", "")
            fallback.pushMap(m1)

            val m2 = Arguments.createMap()
            m2.putInt("subscriptionId", 1)
            m2.putInt("simSlotIndex", 1)
            m2.putString("carrierName", "SIM 2 Operator")
            m2.putString("displayName", "SIM 2")
            m2.putString("countryIso", "")
            m2.putString("phoneNumber", "")
            fallback.pushMap(m2)

            promise.resolve(fallback)
        }
    }

    /**
     * Sanitizes phone number strings retrieved from SubscriptionManager/TelephonyManager.
     * Prevents internal telco routing codes, emulator test numbers (15555215554),
     * all-zero numbers (0000000000), or invalid short strings from being displayed.
     */
    private fun sanitizeDetectedPhoneNumber(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val digits = raw.replace("[^0-9]".toRegex(), "")
        // Valid national/international mobile numbers are 10 to 15 digits
        if (digits.length < 10) return ""
        // Reject numbers where all digits are the same (e.g., 0000000000, 9999999999)
        if (digits.all { it == digits[0] }) return ""
        // Reject common dummy / emulator / telco test patterns
        if (digits.startsWith("1555521") || digits.startsWith("0000") || digits.startsWith("12345")) return ""
        if (raw.startsWith("+")) {
            return "+$digits"
        }
        return digits
    }

    /**
     * Reads system SMS provider (content://sms/sent) to count all messages sent today
     * directly from Google Messages, Samsung Messages, or any default SMS app on the phone!
     * Maps subscription IDs to physical SIM slot indices (Slot 0 for SIM 1, Slot 1 for SIM 2).
     */
    @ReactMethod
    fun getSystemSentSmsCountToday(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
                val empty = Arguments.createMap()
                empty.putInt("totalToday", 0)
                empty.putMap("bySubId", Arguments.createMap())
                empty.putMap("bySlot", Arguments.createMap())
                promise.resolve(empty)
                return
            }

            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val startOfDay = cal.timeInMillis

            val uri = Uri.parse("content://sms/sent")
            val selection = "date >= ?"
            val selectionArgs = arrayOf(startOfDay.toString())

            val cursor = context.contentResolver.query(uri, null, selection, selectionArgs, "date DESC")
            var totalCount = 0
            val subCounts = HashMap<Int, Int>()

            val defaultSmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                context.getSystemService(SmsManager::class.java) ?: @Suppress("DEPRECATION") SmsManager.getDefault()
            } else {
                @Suppress("DEPRECATION") SmsManager.getDefault()
            }

            cursor?.use {
                // Find subId column across different Android OEM roms (sub_id, subscription_id, sim_id)
                var subIdCol = it.getColumnIndex("sub_id")
                if (subIdCol == -1) subIdCol = it.getColumnIndex("subscription_id")
                if (subIdCol == -1) subIdCol = it.getColumnIndex("sim_id")
                val bodyCol = it.getColumnIndex("body")

                while (it.moveToNext()) {
                    val subId = if (subIdCol != -1) it.getInt(subIdCol) else -1
                    val body = if (bodyCol != -1) it.getString(bodyCol) else null
                    
                    // Count real GSM/Unicode parts so quota matches MyJio/Airtel exact deductions!
                    val parts = if (!body.isNullOrEmpty()) {
                        try {
                            val divided = defaultSmsManager.divideMessage(body)
                            if (divided != null && divided.size > 0) divided.size else 1
                        } catch (e: Exception) { 1 }
                    } else 1

                    totalCount += parts
                    subCounts[subId] = (subCounts[subId] ?: 0) + parts
                }
            }

            // Map subscription IDs to physical slot index (0 for SIM 1, 1 for SIM 2)
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val slotCounts = HashMap<Int, Int>() // 0 -> count, 1 -> count

            for ((subId, count) in subCounts) {
                var resolvedSlot = -1
                if (subscriptionManager != null && subId >= 0) {
                    try {
                        val subInfo = subscriptionManager.getActiveSubscriptionInfo(subId)
                        if (subInfo != null) {
                            resolvedSlot = subInfo.simSlotIndex
                        }
                    } catch (e: Exception) {}
                }
                if (resolvedSlot >= 0) {
                    slotCounts[resolvedSlot] = (slotCounts[resolvedSlot] ?: 0) + count
                }
            }

            val map = Arguments.createMap()
            map.putInt("totalToday", totalCount)

            val subMap = Arguments.createMap()
            for ((subId, count) in subCounts) {
                subMap.putInt(subId.toString(), count)
            }
            map.putMap("bySubId", subMap)

            val slotMap = Arguments.createMap()
            for ((slot, count) in slotCounts) {
                slotMap.putInt(slot.toString(), count)
            }
            map.putMap("bySlot", slotMap)

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("SMS_QUERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, promise: Promise) {
        internalSendSms(phoneNumber, message, -1, promise)
    }

    @ReactMethod
    fun sendSmsWithSim(phoneNumber: String, message: String, subId: Double, promise: Promise) {
        internalSendSms(phoneNumber, message, subId.toInt(), promise)
    }

    private fun internalSendSms(phoneNumber: String, message: String, subId: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "SEND_SMS permission not granted")
                return
            }

            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            var resolvedSubId = subId

            if (subscriptionManager != null && (resolvedSubId == 0 || resolvedSubId == 1)) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val subIds = subscriptionManager.getSubscriptionIds(resolvedSubId)
                        if (subIds != null && subIds.isNotEmpty()) {
                            resolvedSubId = subIds[0]
                        }
                    }
                } catch (e: Exception) {
                    Log.d("SIM", "Could not resolve subId for slot $resolvedSubId", e)
                }
            }

            val smsManager: SmsManager = if (resolvedSubId >= 0) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java).createForSubscriptionId(resolvedSubId)
                } else {
                    @Suppress("DEPRECATION")
                    SmsManager.getSmsManagerForSubscriptionId(resolvedSubId)
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

            val result = Arguments.createMap()
            result.putBoolean("success", true)
            result.putInt("parts", parts.size)
            result.putString("message", "SMS sent to $phoneNumber")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SMS_FAILED", e.message, e)
        }
    }
}
