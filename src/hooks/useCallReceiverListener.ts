import { useEffect, useContext, useRef } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { AppContext } from "../context/AppContext";
import { sendTheSms } from "../services/smsService";

const { CallModule } = NativeModules;

export function useCallReceiverListener() {
  const {
    automations,
    contacts,
    logs,
    addLog,
    replaceTags,
    incrementQuota,
  } = useContext(AppContext);

  // Keep references to latest state without triggering re-subscription
  const stateRef = useRef({
    automations,
    contacts,
    logs,
    addLog,
    replaceTags,
    incrementQuota,
  });

  useEffect(() => {
    stateRef.current = {
      automations,
      contacts,
      logs,
      addLog,
      replaceTags,
      incrementQuota,
    };
  }, [
    automations,
    contacts,
    logs,
    addLog,
    replaceTags,
    incrementQuota,
  ]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let subMissed: any;
    let subCompleted: any;
    let subFallback: any;

    const setup = async () => {
      try {
        // 1. Safe check first without requiring an active Activity
        let hasPhoneState = false;
        let hasCallLog = false;
        try {
          hasPhoneState = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
          );
          hasCallLog = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
          );
        } catch {
          hasPhoneState = true;
          hasCallLog = true;
        }

        // 2. Only request if not yet granted and wrap safely against Activity state errors
        if (!hasPhoneState || !hasCallLog) {
          try {
            const permissionsToRequest = [
              PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
              PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
              PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
              PermissionsAndroid.PERMISSIONS.SEND_SMS,
            ];

            if (Number(Platform.Version) >= 33) {
              permissionsToRequest.push(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
              );
            }

            const granted = await PermissionsAndroid.requestMultiple(
              permissionsToRequest
            );

            hasPhoneState =
              granted["android.permission.READ_PHONE_STATE"] ===
              PermissionsAndroid.RESULTS.GRANTED;
            hasCallLog =
              granted["android.permission.READ_CALL_LOG"] ===
              PermissionsAndroid.RESULTS.GRANTED;
          } catch (reqErr: any) {
            console.log(
              "ℹ️ Permission request skipped (activity unattached):",
              reqErr?.message
            );
          }
        }

        if (!hasPhoneState || !hasCallLog) {
          console.warn("⚠️ Phone or Call Log permissions not granted");
          return;
        }

        const eventEmitter = new NativeEventEmitter(CallModule);

        // 1. Missed Call Event
        subMissed = eventEmitter.addListener("CallMissed", async (number) => {
          console.log("📞 Event: CallMissed received for", number);
          await handleCallTrigger(number, "missed");
        });

        // 2. Completed / Answered Call Event
        subCompleted = eventEmitter.addListener("CallCompleted", async (number) => {
          console.log("📞 Event: CallCompleted received for", number);
          await handleCallTrigger(number, "completed");
        });

        // 3. Fallback event
        subFallback = eventEmitter.addListener(
          "MissedOrEndedCall",
          async (number) => {
            // Handled if specific events weren't caught
            if (!number) {
              try {
                const details = await CallModule.getLastCallDetails();
                if (details?.number) {
                  const type = details.type === "MISSED" ? "missed" : "completed";
                  await handleCallTrigger(details.number, type);
                }
              } catch (e) {
                console.error("Error inspecting call details", e);
              }
            }
          }
        );

        CallModule.startListening();
      } catch (err) {
        console.error("⚠️ Failed to setup call listener", err);
      }
    };

    setup();

    return () => {
      subMissed?.remove();
      subCompleted?.remove();
      subFallback?.remove();
      try {
        CallModule?.stopListening();
      } catch (e) {}
    };
  }, []);

  const isWithinWorkingHours = (start: string, end: string): boolean => {
    try {
      const now = new Date();
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return true;
    }
  };

  const handleCallTrigger = async (
    rawNumber: string | null,
    triggerType: "missed" | "completed"
  ) => {
    const {
      automations: currentAuto,
      contacts: currentContacts,
      logs: currentLogs,
      addLog: doAddLog,
      replaceTags: doReplaceTags,
      incrementQuota: doIncrement,
    } = stateRef.current;

    // Fetch number if null
    let phone = rawNumber;
    if (!phone) {
      try {
        const details = await CallModule.getLastCallDetails();
        phone = details?.number || (await CallModule.getLastCallNumber());
      } catch (e) {
        console.error("Failed to query last number", e);
      }
    }

    if (!phone || phone === "Unknown") {
      console.log("⚠️ No caller phone number available. Skipping.");
      return;
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9+]/g, "");

    // 1. Check if trigger rule is enabled
    const isMissed = triggerType === "missed";
    const isEnabled = isMissed
      ? currentAuto.missedCallEnabled
      : currentAuto.callEndedEnabled;

    if (!isEnabled) {
      console.log(`ℹ️ Auto-reply for ${triggerType} call is disabled.`);
      return;
    }

    // 2. Check Working Hours
    if (
      currentAuto.workingHoursOnly &&
      !isWithinWorkingHours(
        currentAuto.workingHoursStart,
        currentAuto.workingHoursEnd
      )
    ) {
      console.log("⏰ Outside business operating hours. Skipping auto-reply.");
      return;
    }

    // 3. Check Blocklist / Exclusions
    const contactMatch = currentContacts.find(
      (c) =>
        c.number.replace(/[^0-9+]/g, "") === cleanPhone ||
        cleanPhone.endsWith(c.number.replace(/[^0-9]/g, "").slice(-10))
    );

    if (contactMatch?.blocked) {
      console.log(`🚫 Contact ${cleanPhone} is marked as Blocked/VIP. Skipping.`);
      return;
    }

    // 4. Anti-Spam / Rate-Limiting Check
    const cooldownMs = (currentAuto.antiSpamHours || 24) * 60 * 60 * 1000;
    const nowTime = Date.now();
    const alreadySentRecently = currentLogs.some((l) => {
      const isSamePhone =
        l.number.replace(/[^0-9+]/g, "") === cleanPhone ||
        cleanPhone.endsWith(l.number.replace(/[^0-9]/g, "").slice(-10));
      const logTime = l.timestamp ? new Date(l.timestamp).getTime() : l.id;
      return isSamePhone && l.status === "sent" && nowTime - logTime < cooldownMs;
    });

    if (alreadySentRecently) {
      console.log(
        `⚠️ Message already sent to ${cleanPhone} within ${currentAuto.antiSpamHours}h cooldown. Skipping.`
      );
      return;
    }

    // 5. Template selection & dynamic tag replacement
    const rawTemplate = isMissed
      ? currentAuto.missedCallTemplate
      : currentAuto.callEndedTemplate;

    if (!rawTemplate?.trim()) {
      console.log("⚠️ No template configured for this trigger.");
      return;
    }

    const finalMessage = doReplaceTags(rawTemplate, contactMatch?.name);

    // 7. Dispatch SMS
    console.log(`🚀 Dispatching auto-reply to ${cleanPhone}...`);
    const res = await sendTheSms(cleanPhone, finalMessage, currentAuto.selectedSimId);
    const usedParts = res.parts || 1;

    if (res.success) {
      await doIncrement(currentAuto.selectedSimId, usedParts);
      await doAddLog({
        number: cleanPhone,
        message: finalMessage,
        status: "sent",
        parts: usedParts,
        trigger: isMissed ? "missed_call" : "call_ended",
      });
      console.log(`✅ Auto-reply SMS dispatched successfully (${usedParts} carrier SMS)!`);
    } else {
      await doAddLog({
        number: cleanPhone,
        message: finalMessage,
        status: "failed",
        parts: usedParts,
        trigger: isMissed ? "missed_call" : "call_ended",
      });
      console.error("❌ Auto-reply SMS dispatch failed:", res.message);
    }
  };
}
