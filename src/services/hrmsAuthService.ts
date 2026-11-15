import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ClientUser {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  company_name?: string;
  status?: string;
  login?: string;
  token?: string;
  is_active?: boolean;
}

export interface AuthResponse {
  status: "success" | "error" | "inactive" | "not_found";
  message: string;
  is_active?: boolean;
  client?: ClientUser;
  errors?: Record<string, string[]>;
}

const STORAGE_KEYS = {
  CLIENT_SESSION: "BIZSMS_CLIENT_SESSION",
  HRMS_URL: "BIZSMS_HRMS_BASE_URL",
  LEGACY_AUTH: "authenticated",
};

/**
 * Standard candidates for HRMS backend:
 * 1. 192.168.0.90:8000 - Local Wi-Fi (works on physical phone and PC)
 * 2. 127.0.0.1:8000 - USB adb reverse or local PC
 * 3. 10.0.2.2:8000 - Android Emulator
 */
export const SERVER_CANDIDATES = [
  "https://hrms.theserviceverse.com",
  "http://192.168.0.90:8000",
  "http://127.0.0.1:8000",
  "http://10.0.2.2:8000",
];

export const getDefaultHrmsUrl = (): string => {
  return "https://hrms.theserviceverse.com";
};

/**
 * Retrieve configured HRMS Base URL from AsyncStorage
 */
export const getHrmsBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.HRMS_URL);
    if (
      saved &&
      saved.trim().length > 0 &&
      !saved.includes("10.0.2.2") &&
      !saved.includes("192.168.0.90") &&
      !saved.includes("127.0.0.1")
    ) {
      return saved.trim().replace(/\/+$/, "");
    }
  } catch (err) {
    console.warn("Failed to load The Serviceverse base URL:", err);
  }
  return getDefaultHrmsUrl();
};

/**
 * Save custom HRMS Base URL
 */
export const setHrmsBaseUrl = async (url: string): Promise<void> => {
  const sanitized = url.trim().replace(/\/+$/, "");
  await AsyncStorage.setItem(STORAGE_KEYS.HRMS_URL, sanitized);
};

/**
 * Save authenticated Client session to AsyncStorage
 */
export const saveClientSession = async (client: ClientUser): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.CLIENT_SESSION, JSON.stringify(client));
  await AsyncStorage.setItem(STORAGE_KEYS.LEGACY_AUTH, "true");
};

/**
 * Retrieve saved Client session from AsyncStorage
 */
export const getClientSession = async (): Promise<ClientUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CLIENT_SESSION);
    if (raw) {
      return JSON.parse(raw) as ClientUser;
    }
  } catch (err) {
    console.warn("Failed to parse client session:", err);
  }
  return null;
};

/**
 * Clear stored Client session (on logout or account deactivation)
 */
export const clearClientSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.CLIENT_SESSION);
  await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY_AUTH);
};

/**
 * Resilient request helper that tries primary URL first, and if unreachable,
 * tries the other candidates (Wi-Fi 192.168.0.90, USB reverse 127.0.0.1, emulator 10.0.2.2).
 */
async function fetchWithCandidateFallback(
  path: string,
  bodyData: any,
  preferredUrl?: string
): Promise<{ json: any; workingUrl: string }> {
  const currentBase = preferredUrl || (await getHrmsBaseUrl());
  const candidates = [
    currentBase,
    ...SERVER_CANDIDATES.filter((u) => u !== currentBase),
  ];

  let lastError: Error | null = null;

  for (const host of candidates) {
    const endpoint = `${host}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(bodyData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      // If we got a valid response (even 422 validation error), this server is alive!
      if (host !== currentBase) {
        await setHrmsBaseUrl(host);
      }
      return { json, workingUrl: host };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      // Try next candidate
    }
  }

  throw new Error(
    `Cannot reach The Serviceverse backend at ${candidates.join(
      ", "
    )}. Please ensure The Serviceverse backend is running and your device is on the same Wi-Fi network.`
  );
}

/**
 * Register a new Client in HRMS
 */
export const registerClient = async (
  data: {
    name: string;
    email: string;
    password: string;
    company_name?: string;
    mobile?: string;
    address?: string;
  },
  customUrl?: string
): Promise<AuthResponse> => {
  const { json } = await fetchWithCandidateFallback(
    "/api/v1/client/register",
    data,
    customUrl
  );
  return json;
};

/**
 * Login Client in HRMS
 */
export const loginClient = async (
  identifier: string,
  password: string,
  customUrl?: string
): Promise<AuthResponse> => {
  const { json } = await fetchWithCandidateFallback(
    "/api/v1/client/login",
    { email: identifier.trim(), password },
    customUrl
  );
  return json;
};

/**
 * Check if the stored Client is still active in HRMS.
 */
export const verifyClientActiveStatus = async (
  client: ClientUser,
  customUrl?: string
): Promise<{
  isActive: boolean;
  client?: ClientUser;
  offline?: boolean;
  message?: string;
}> => {
  try {
    const { json } = await fetchWithCandidateFallback(
      "/api/v1/client/check-status",
      {
        client_id: client.id,
        email: client.email,
        token: client.token,
      },
      customUrl
    );

    if (json.is_active === true) {
      const updatedClient: ClientUser = {
        ...client,
        ...(json.client || {}),
        is_active: true,
      };
      await saveClientSession(updatedClient);
      return { isActive: true, client: updatedClient, message: json.message };
    } else {
      return {
        isActive: false,
        client: json.client || client,
        message: json.message || "Account is inactive or disabled.",
      };
    }
  } catch (error: any) {
    console.warn("Could not reach The Serviceverse server during status check:", error.message);
    return {
      isActive: true, // Graceful fallback if previously logged in
      offline: true,
      client,
      message: "The Serviceverse server offline or unreachable. Using cached session.",
    };
  }
};
