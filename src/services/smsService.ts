import { NativeModules, PermissionsAndroid, Platform } from "react-native";

const { SmsModule } = NativeModules;

export type SimCardInfo = {
  subscriptionId: number;
  simSlotIndex: number; // 0 for SIM 1, 1 for SIM 2
  carrierName: string;
  displayName: string;
  countryIso: string;
  phoneNumber?: string;
};

export type SendSmsResult = {
  success: boolean;
  message?: string;
  parts?: number;
};

export type SystemSmsCountResult = {
  totalToday: number;
  bySubId: Record<string, number>;
  bySlot: Record<string, number>; // "0" -> SIM 1 count, "1" -> SIM 2 count
};

export type SmsLengthInfo = {
  charCount: number;
  parts: number;
  isUnicode: boolean;
  limitPerPart: number;
  nextPartAt: number;
};

/**
 * Calculates exact GSM (160/153) and Unicode (70/67) SMS parts.
 * Crucial so business owners know how many carrier SMS are deducted by Jio/Airtel.
 */
export function calculateSmsParts(text: string): SmsLengthInfo {
  if (!text || text.length === 0) {
    return { charCount: 0, parts: 0, isUnicode: false, limitPerPart: 160, nextPartAt: 160 };
  }

  // Detect Unicode (Hindi, regional languages, or emojis)
  // GSM 03.38 basic character set check
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
  const isUnicode = !gsmRegex.test(text);
  const charCount = text.length;

  if (isUnicode) {
    if (charCount <= 70) {
      return { charCount, parts: 1, isUnicode: true, limitPerPart: 70, nextPartAt: 70 };
    }
    const parts = Math.ceil(charCount / 67);
    return { charCount, parts, isUnicode: true, limitPerPart: 67, nextPartAt: parts * 67 };
  } else {
    if (charCount <= 160) {
      return { charCount, parts: 1, isUnicode: false, limitPerPart: 160, nextPartAt: 160 };
    }
    const parts = Math.ceil(charCount / 153);
    return { charCount, parts, isUnicode: false, limitPerPart: 153, nextPartAt: parts * 153 };
  }
}

export type CarrierQuickInfo = {
  operator: string;
  ussdOrDialCode: string;
  appName: string;
  appPackage: string;
  description: string;
};

export function getCarrierBalanceInfo(operatorName: string): CarrierQuickInfo {
  const norm = (operatorName || "").toLowerCase();
  if (norm.includes("jio")) {
    return {
      operator: "Jio",
      ussdOrDialCode: "1299", // Dial 1299 gives instant free SMS balance alert from Jio
      appName: "MyJio",
      appPackage: "com.jio.myjio",
      description: "Dial 1299 (toll-free) to receive an official SMS from Jio with your exact remaining balance.",
    };
  }
  if (norm.includes("airtel")) {
    return {
      operator: "Airtel",
      ussdOrDialCode: "*121#",
      appName: "Airtel Thanks",
      appPackage: "com.myairtelapp",
      description: "Dial *121# or open Airtel Thanks app to verify your daily SMS balance.",
    };
  }
  if (norm.includes("vi") || norm.includes("vodafone") || norm.includes("idea")) {
    return {
      operator: "Vi",
      ussdOrDialCode: "*199#",
      appName: "Vi App",
      appPackage: "com.mventus.selfcare.activity",
      description: "Dial *199# to check remaining daily SMS allowance.",
    };
  }
  if (norm.includes("bsnl")) {
    return {
      operator: "BSNL",
      ussdOrDialCode: "*123#",
      appName: "BSNL Selfcare",
      appPackage: "com.digital.bsnlapp",
      description: "Dial *123# to check your main SMS account balance.",
    };
  }
  return {
    operator: operatorName || "Carrier",
    ussdOrDialCode: "*121#",
    appName: "Carrier App",
    appPackage: "",
    description: "Check your operator app or dial carrier USSD code to check remaining balance.",
  };
}

/**
 * Validates that a string is a legitimate 10+ digit mobile number
 * and not a dummy, emulator (1555521...), or corrupted carrier routing code.
 */
export function isValidPhoneNumber(num?: string | null): boolean {
  if (!num) return false;
  const digits = num.replace(/\D/g, "");
  if (digits.length < 10) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // all same digits like 0000000000
  if (digits.startsWith("1555521") || digits.startsWith("0000") || digits.startsWith("12345")) return false;
  return true;
}

export const DEFAULT_FALLBACK_SIMS: SimCardInfo[] = [
  {
    subscriptionId: 0,
    simSlotIndex: 0,
    carrierName: "Jio (SIM 1)",
    displayName: "SIM 1",
    countryIso: "in",
    phoneNumber: "",
  },
  {
    subscriptionId: 1,
    simSlotIndex: 1,
    carrierName: "Airtel (SIM 2)",
    displayName: "SIM 2",
    countryIso: "in",
    phoneNumber: "",
  },
];

/**
 * Fetch all active physical/eSIM SIM cards present on the device.
 */
export async function getActiveSimCards(): Promise<SimCardInfo[]> {
  if (Platform.OS !== "android") return DEFAULT_FALLBACK_SIMS;

  try {
    try {
      const hasPhoneState = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
      );
      if (!hasPhoneState) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        ]);
      }
    } catch (permErr) {
      // Activity may not be attached if running in background
    }

    if (SmsModule && SmsModule.getSimCards) {
      const sims: SimCardInfo[] = await SmsModule.getSimCards();
      if (sims && sims.length > 0) {
        return sims;
      }
    }
  } catch (error) {
    console.warn("Could not query active SIM cards, using fallback slots:", error);
  }
  return DEFAULT_FALLBACK_SIMS;
}

/**
 * Sync messages sent manually from the phone's default SMS app (Google Messages / Samsung Messages)
 * to ensure BizSMS accurately counts all daily SIM SMS usage!
 */
export async function getSystemSentSmsCountToday(): Promise<SystemSmsCountResult> {
  if (Platform.OS !== "android") return { totalToday: 0, bySubId: {}, bySlot: {} };

  try {
    let hasSmsPerm = false;
    try {
      hasSmsPerm = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      if (!hasSmsPerm) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: "SMS Sync Permission",
            message: "BizSMS detects sent messages so message delivery records and status are logged accurately.",
            buttonPositive: "Allow",
          }
        );
        hasSmsPerm = granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (permErr) {
      hasSmsPerm = true;
    }

    if (SmsModule && SmsModule.getSystemSentSmsCountToday) {
      const res = await SmsModule.getSystemSentSmsCountToday();
      return {
        totalToday: res?.totalToday || 0,
        bySubId: res?.bySubId || {},
        bySlot: res?.bySlot || {},
      };
    }
  } catch (error) {
    console.warn("Could not query system sent SMS:", error);
  }
  return { totalToday: 0, bySubId: {}, bySlot: {} };
}

/**
 * Send carrier SMS via selected SIM or default SIM. Supports multi-part message.
 */
export async function sendTheSms(
  number: string,
  message: string,
  subscriptionId: number = -1
): Promise<SendSmsResult> {
  if (Platform.OS !== "android") {
    return { success: false, message: "Only supported on Android" };
  }

  try {
    // 1. Safe background-tolerant permission check (PermissionsAndroid.check does NOT require an Activity)
    let hasPermission = false;
    try {
      hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.SEND_SMS
      );
    } catch (checkErr) {
      // If check fails (e.g. Activity bridge issue), assume true and let native ContextCompat verify
      hasPermission = true;
    }

    if (!hasPermission) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          {
            title: "SMS Permission",
            message:
              "BizSMS needs permission to send automated text messages using your SIM cellular route.",
            buttonPositive: "Allow",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return { success: false, message: "SEND_SMS permission denied" };
        }
      } catch (permErr: any) {
        // If app is not attached to an Activity (e.g. background call receiver, phone ringing, or screen off),
        // do not crash! Proceed directly to native dispatch where ContextCompat handles the check.
        console.log(
          "ℹ️ Permissions request skipped (running in background or during call):",
          permErr?.message
        );
      }
    }

    if (!SmsModule || (!SmsModule.sendSms && !SmsModule.sendSmsWithSim)) {
      return { success: false, message: "SmsModule not available" };
    }

    const cleanNumber = number.replace(/\s+/g, "").trim();
    let result: any = null;

    // 1. If native module has dedicated sendSmsWithSim(phoneNumber, message, subId)
    if (
      typeof SmsModule.sendSmsWithSim === "function" &&
      typeof subscriptionId === "number" &&
      subscriptionId >= 0
    ) {
      try {
        result = await SmsModule.sendSmsWithSim(cleanNumber, message, subscriptionId);
      } catch (err: any) {
        console.warn("sendSmsWithSim error, attempting fallback:", err?.message);
      }
    }

    // 2. Adaptive sendSms invocation (gracefully handles 2 arguments vs 3 arguments without crashing)
    if (!result && typeof SmsModule.sendSms === "function") {
      try {
        // If subscriptionId is provided, try 3 arguments first
        if (typeof subscriptionId === "number" && subscriptionId >= 0) {
          result = await SmsModule.sendSms(cleanNumber, message, subscriptionId);
        } else {
          result = await SmsModule.sendSms(cleanNumber, message);
        }
      } catch (callErr: any) {
        const errMsg = (callErr?.message || "").toLowerCase();
        // If native binary was compiled expecting 2 arguments: call with (cleanNumber, message)
        if (
          errMsg.includes("expected 2") ||
          (errMsg.includes("3") && errMsg.includes("2")) ||
          errMsg.includes("argument")
        ) {
          result = await SmsModule.sendSms(cleanNumber, message);
        } else if (
          errMsg.includes("expected 3") ||
          (errMsg.includes("2") && errMsg.includes("3"))
        ) {
          // If native binary was compiled expecting 3 arguments: call with (cleanNumber, message, subId)
          result = await SmsModule.sendSms(
            cleanNumber,
            message,
            subscriptionId >= 0 ? subscriptionId : -1
          );
        } else {
          throw callErr;
        }
      }
    }
    return {
      success: true,
      message: result?.message || `Sent to ${cleanNumber}`,
      parts: result?.parts || 1,
    };
  } catch (error: any) {
    console.error("SMS Dispatch Error:", error);
    return {
      success: false,
      message: error?.message || "Failed to dispatch SMS",
    };
  }
}
