import React, { createContext, useState, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Contacts from "react-native-contacts";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import {
  getActiveSimCards,
  sendTheSms,
  SimCardInfo,
  DEFAULT_FALLBACK_SIMS,
  getSystemSentSmsCountToday,
  isValidPhoneNumber,
} from "../services/smsService";
import {
  ClientUser,
  getClientSession,
  clearClientSession,
  verifyClientActiveStatus,
} from "../services/hrmsAuthService";

const { CallModule } = NativeModules;

export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  category: string;
  phone: string;
  whatsapp: string;
  mapsLink: string;
  catalogLink: string;
  tagline: string;
};

export type AutomationSettings = {
  missedCallEnabled: boolean;
  missedCallTemplate: string;
  callEndedEnabled: boolean;
  callEndedTemplate: string;
  antiSpamHours: number;
  workingHoursOnly: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  selectedSimId: number; // 0 for SIM 1, 1 for SIM 2, or subId
};

export type SimQuotaState = {
  lastResetDate: string; // YYYY-MM-DD local device time
  dailyLimit: number; // default 100
  safetyReserve: number; // default 5 (safe cutoff at 95)
  simCounts: Record<string, number>; // keys: slot_0, slot_1, and subIds
  lastAlignedTime?: string;
  lastAlignedSource?: string;
};

export type Campaign = {
  id: string;
  title: string;
  category: "festival" | "offer" | "reminder" | "general";
  message: string;
  targetNumbers: string[];
  scheduledAt: string;
  status: "scheduled" | "running" | "completed" | "cancelled";
  sentCount: number;
  totalCount: number;
  createdAt: string;
};

export type Log = {
  id: number;
  number: string;
  message: string;
  status: "sent" | "failed";
  trigger?: "missed_call" | "call_ended" | "campaign" | "manual";
  simName?: string;
  simSlotIndex?: number;
  subscriptionId?: number;
  parts?: number;
  timestamp?: string;
};

export type Contact = {
  id: string;
  name: string;
  number: string;
  blocked: boolean;
  favorite?: boolean;
};

export type CustomTemplate = {
  id: number;
  identifier: string;
  message: string;
};

export type Templates = {
  default: string;
  custom: CustomTemplate[];
};

export function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLocalToday(timestampOrId?: string | number): boolean {
  if (!timestampOrId) return false;
  const d = new Date(timestampOrId);
  const today = getLocalTodayString();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` === today;
}

type AppContextType = {
  // SIM & Quota
  simCards: SimCardInfo[];
  refreshSimCards: () => Promise<void>;
  syncSystemSmsQuota: () => Promise<void>;
  quotaState: SimQuotaState;
  getRemainingQuota: (simId?: number) => number;
  getSimQuotaUsed: (sim: SimCardInfo) => number;
  getSimQuotaRemaining: (sim: SimCardInfo) => number;
  setSimQuotaUsed: (subIdOrSlotOrSim: number | string | SimCardInfo, count: number) => Promise<void>;
  alignQuotaWithCarrier: (
    sim: SimCardInfo,
    data: { used?: number; remaining?: number; source?: string }
  ) => Promise<void>;
  resetSimQuota: (subIdOrSlotOrSim?: number | string | SimCardInfo) => Promise<void>;
  setDailyLimit: (limit: number) => Promise<void>;
  setSafetyReserve: (reserve: number) => Promise<void>;
  incrementQuota: (simId?: number, partsCount?: number) => Promise<void>;
  resetTodayQuota: () => Promise<void>;
  setSelectedSimId: (simId: number) => Promise<void>;
  getSelectedSim: () => SimCardInfo;
  getSimDisplayLabel: (sim: SimCardInfo) => string;
  getSimOperator: (sim: SimCardInfo) => string;
  getSimPhoneNumber: (sim: SimCardInfo) => string;
  simLabels: Record<string, string>;
  simOperators: Record<string, string>;
  setSimLabel: (subId: number, label: string) => Promise<void>;
  setSimDetails: (
    subIdOrSlotOrSim: number | string | SimCardInfo,
    operatorName: string,
    phoneNumber: string
  ) => Promise<void>;

  // Business Profile
  profile: BusinessProfile;
  updateProfile: (profile: BusinessProfile) => Promise<void>;
  replaceTags: (template: string, recipientName?: string) => string;

  // Automations
  automations: AutomationSettings;
  updateAutomations: (settings: AutomationSettings) => Promise<void>;

  // Campaigns
  campaigns: Campaign[];
  createCampaign: (
    campaign: Omit<Campaign, "id" | "status" | "sentCount" | "createdAt">
  ) => Promise<Campaign>;
  cancelCampaign: (id: string) => Promise<void>;
  executeCampaignNow: (id: string, directCamp?: Campaign) => Promise<void>;

  // Contacts
  contacts: Contact[];
  blockContact: (id: string) => Promise<void>;
  unblockContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  addManualContact: (name: string, number: string) => Promise<void>;
  toggleFavoriteContact: (idOrNumber: string) => Promise<void>;
  updateFavoritesBulk: (numbersOrIds: string[], isFavorite: boolean) => Promise<void>;

  // Logs
  logs: Log[];
  addLog: (log: Omit<Log, "id" | "timestamp">) => Promise<void>;
  retryFailedLog: (id: number) => Promise<boolean>;
  clearLogs: () => Promise<void>;

  // Legacy compatibility
  templates: Templates;
  setTemplates: (templates: Templates) => Promise<void>;
  resendMessage: (id: number) => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshCounter: () => Promise<number>;

  // Client & HRMS Auth
  clientUser: ClientUser | null;
  authenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  logoutClient: () => Promise<void>;
  refreshClientStatus: () => Promise<boolean>;
  syncClientProfile: (client: ClientUser) => Promise<void>;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

const STORAGE_KEYS = {
  templates: "APP_TEMPLATES",
  logs: "APP_LOGS",
  contacts: "APP_CONTACTS",
  profile: "APP_BUSINESS_PROFILE",
  automations: "APP_AUTOMATIONS",
  quota: "APP_SIM_QUOTA",
  campaigns: "APP_CAMPAIGNS",
  simLabels: "APP_SIM_LABELS",
  simOperators: "APP_SIM_OPERATORS",
};

const defaultProfile: BusinessProfile = {
  businessName: "My Business",
  ownerName: "Owner",
  category: "Clinic / Healthcare",
  phone: "",
  whatsapp: "",
  mapsLink: "https://maps.google.com",
  catalogLink: "https://mybusiness.com",
  tagline: "Always at your service!",
};

const defaultAutomations: AutomationSettings = {
  missedCallEnabled: true,
  missedCallTemplate:
    "Hi {name}, thank you for calling {business_name}. I am busy with a client and could not answer. I will call you back shortly. Check our info: {catalog_link}",
  callEndedEnabled: true,
  callEndedTemplate:
    "Thank you for speaking with {business_name}! Save our contact: {phone} | Location: {maps_link} | WhatsApp: {whatsapp}. Have a great day!",
  antiSpamHours: 24,
  workingHoursOnly: false,
  workingHoursStart: "09:00",
  workingHoursEnd: "20:00",
  selectedSimId: 0, // Default to SIM 1 (Slot 0)
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [profile, _setProfile] = useState<BusinessProfile>(defaultProfile);
  const [automations, _setAutomations] = useState<AutomationSettings>(defaultAutomations);
  const [quotaState, _setQuotaState] = useState<SimQuotaState>({
    lastResetDate: getLocalTodayString(),
    dailyLimit: 100,
    safetyReserve: 5,
    simCounts: {},
  });
  const [simCards, _setSimCards] = useState<SimCardInfo[]>(DEFAULT_FALLBACK_SIMS);
  const [simLabels, _setSimLabels] = useState<Record<string, string>>({});
  const [simOperators, _setSimOperators] = useState<Record<string, string>>({});
  const [campaigns, _setCampaigns] = useState<Campaign[]>([]);
  const [logs, _setLogs] = useState<Log[]>([]);
  const [contacts, _setContacts] = useState<Contact[]>([]);
  const [templates, _setTemplates] = useState<Templates>({
    default: "Hello, this is a default message!",
    custom: [],
  });
  const [clientUser, _setClientUser] = useState<ClientUser | null>(null);
  const [authenticated, _setAuthenticated] = useState<boolean>(false);

  // Load all initial data
  useEffect(() => {
    const initData = async () => {
      try {
        const [
          storedProfile,
          storedAuto,
          storedQuota,
          storedCampaigns,
          storedLogs,
          storedContacts,
          storedTemplates,
          storedSimLabels,
          storedSimOperators,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.automations),
          AsyncStorage.getItem(STORAGE_KEYS.quota),
          AsyncStorage.getItem(STORAGE_KEYS.campaigns),
          AsyncStorage.getItem(STORAGE_KEYS.logs),
          AsyncStorage.getItem(STORAGE_KEYS.contacts),
          AsyncStorage.getItem(STORAGE_KEYS.templates),
          AsyncStorage.getItem(STORAGE_KEYS.simLabels),
          AsyncStorage.getItem(STORAGE_KEYS.simOperators),
        ]);

        if (storedProfile) _setProfile(JSON.parse(storedProfile));
        if (storedAuto) _setAutomations(JSON.parse(storedAuto));
        if (storedCampaigns) _setCampaigns(JSON.parse(storedCampaigns));
        if (storedLogs) _setLogs(JSON.parse(storedLogs));
        if (storedContacts) _setContacts(JSON.parse(storedContacts));
        if (storedTemplates) _setTemplates(JSON.parse(storedTemplates));
        if (storedSimLabels) _setSimLabels(JSON.parse(storedSimLabels));
        if (storedSimOperators) _setSimOperators(JSON.parse(storedSimOperators));

        // Quota check with midnight reset using device's local timezone
        const today = getLocalTodayString();
        if (storedQuota) {
          const parsedQuota: SimQuotaState = JSON.parse(storedQuota);
          if (parsedQuota.lastResetDate !== today) {
            const freshQuota: SimQuotaState = {
              lastResetDate: today,
              dailyLimit: parsedQuota.dailyLimit || 100,
              safetyReserve: parsedQuota.safetyReserve ?? 5,
              simCounts: {},
            };
            _setQuotaState(freshQuota);
            await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(freshQuota));
          } else {
            _setQuotaState(parsedQuota);
          }
        } else {
          const initialQuota: SimQuotaState = {
            lastResetDate: today,
            dailyLimit: 100,
            safetyReserve: 5,
            simCounts: {},
          };
          _setQuotaState(initialQuota);
          await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(initialQuota));
        }

        await fetchSimCards();
        await syncSystemSmsQuota();
        await loadContacts(storedContacts);

        const savedClient = await getClientSession();
        if (savedClient) {
          _setClientUser(savedClient);
        }

        // Immediately sync rules & profile to Android native SharedPreferences
        // so CallReceiver can respond to calls even when app is killed or phone is locked!
        const loadedAuto = storedAuto ? JSON.parse(storedAuto) : automations;
        const loadedProfile = storedProfile ? JSON.parse(storedProfile) : profile;
        const loadedContacts = storedContacts ? JSON.parse(storedContacts) : [];
        syncToNative(loadedAuto, loadedProfile, loadedContacts);
      } catch (err) {
        console.error("BizSMS initialization error:", err);
      }
    };

    initData();
  }, []);

  const logoutClient = async () => {
    await clearClientSession();
    _setClientUser(null);
    _setAuthenticated(false);
  };

  const refreshClientStatus = async (): Promise<boolean> => {
    const client = clientUser || (await getClientSession());
    if (!client) {
      await logoutClient();
      return false;
    }
    const result = await verifyClientActiveStatus(client);
    if (!result.isActive) {
      await logoutClient();
      return false;
    }
    if (result.client) {
      _setClientUser(result.client);
    }
    return true;
  };

  const syncClientProfile = async (client: ClientUser) => {
    _setClientUser(client);
    _setProfile((prev) => ({
      ...prev,
      businessName: client.company_name || prev.businessName,
      ownerName: client.name || prev.ownerName,
      phone: client.mobile || prev.phone,
    }));
  };

  const syncSystemSmsQuota = async () => {
    try {
      const sysCount = await getSystemSentSmsCountToday();
      const today = getLocalTodayString();
      if (sysCount.totalToday > 0) {
        _setQuotaState((prev) => {
          const currentCounts = prev.lastResetDate === today ? { ...prev.simCounts } : {};

          // 1. Sync mapped slot counts if available
          if (sysCount.bySlot) {
            for (const [slotStr, count] of Object.entries(sysCount.bySlot)) {
              const slotKey = `slot_${slotStr}`;
              currentCounts[slotKey] = Math.max(currentCounts[slotKey] || 0, count);
            }
          }

          // 2. Sync subId counts if available
          if (sysCount.bySubId) {
            for (const [subIdStr, count] of Object.entries(sysCount.bySubId)) {
              if (subIdStr !== "-1") {
                currentCounts[subIdStr] = Math.max(currentCounts[subIdStr] || 0, count);
              }
            }
          }

          // 3. If there were unassigned (-1) messages, attribute them to active SIM slot
          const unassigned = sysCount.bySubId?.["-1"] || 0;
          if (unassigned > 0) {
            const activeSim = getSelectedSim();
            const activeSlotKey = `slot_${activeSim.simSlotIndex}`;
            currentCounts[activeSlotKey] = Math.max(currentCounts[activeSlotKey] || 0, unassigned);
          }

          const updated: SimQuotaState = {
            ...prev,
            lastResetDate: today,
            dailyLimit: prev.dailyLimit || 100,
            safetyReserve: prev.safetyReserve ?? 5,
            simCounts: currentCounts,
          };
          AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.warn("Could not sync system SMS quota:", e);
    }
  };

  const fetchSimCards = async () => {
    try {
      const sims = await getActiveSimCards();
      if (sims && sims.length > 0) {
        _setSimCards(sims);
      }
      await syncSystemSmsQuota();
    } catch (e) {
      console.warn("Could not load SIM cards", e);
    }
  };

  const syncToNative = (
    currentAuto: AutomationSettings,
    currentProfile: BusinessProfile,
    currentContacts: Contact[]
  ) => {
    try {
      if (CallModule && CallModule.syncNativeSettings) {
        const payload = JSON.stringify({
          automations: currentAuto,
          profile: currentProfile,
          blockedNumbers: currentContacts.filter((c) => c.blocked).map((c) => c.number),
        });
        CallModule.syncNativeSettings(payload).catch((e: any) =>
          console.log("Native sync notice:", e)
        );
      }
    } catch (e) {}
  };

  const getSimOperator = (sim: SimCardInfo): string => {
    const slotKey = `slot_${sim.simSlotIndex}`;
    const subKey = sim.subscriptionId.toString();
    const custom = simOperators[slotKey] || simOperators[subKey];
    if (custom && custom.trim()) return custom.trim();
    if (
      sim.carrierName &&
      sim.carrierName.trim() &&
      !sim.carrierName.toLowerCase().startsWith("operator")
    ) {
      return sim.carrierName.trim();
    }
    return `Operator ${sim.simSlotIndex + 1}`;
  };

  const getSimPhoneNumber = (sim: SimCardInfo): string => {
    const slotKey = `slot_${sim.simSlotIndex}`;
    const subKey = sim.subscriptionId.toString();
    const custom = simLabels[slotKey] || simLabels[subKey];
    if (custom && custom.trim()) return custom.trim();

    // Check if detected sim.phoneNumber is real and valid (not dummy or empty)
    if (sim.phoneNumber && isValidPhoneNumber(sim.phoneNumber)) {
      return sim.phoneNumber.trim();
    }
    return "";
  };

  const getSimDisplayLabel = (sim: SimCardInfo): string => {
    const op = getSimOperator(sim);
    const num = getSimPhoneNumber(sim);
    if (num) {
      return `SIM ${sim.simSlotIndex + 1} (${op}) • ${num}`;
    }
    return `SIM ${sim.simSlotIndex + 1} (${op})`;
  };

  const getSelectedSim = (): SimCardInfo => {
    const list = simCards.length > 0 ? simCards : DEFAULT_FALLBACK_SIMS;
    if (automations.selectedSimId >= 0) {
      const match = list.find(
        (s) =>
          s.subscriptionId === automations.selectedSimId ||
          s.simSlotIndex === automations.selectedSimId
      );
      if (match) return match;
    }
    return list[0];
  };

  const setSelectedSimId = async (simId: number) => {
    const updated = { ...automations, selectedSimId: simId };
    _setAutomations(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.automations, JSON.stringify(updated));
    syncToNative(updated, profile, contacts);
  };

  const setSimLabel = async (subId: number, label: string) => {
    const updated = { ...simLabels, [subId.toString()]: label };
    _setSimLabels(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.simLabels, JSON.stringify(updated));
  };

  const setSimDetails = async (
    subIdOrSlotOrSim: number | string | SimCardInfo,
    operatorName: string,
    phoneNumber: string
  ) => {
    let slotKey = "";
    let subKey = "";

    if (typeof subIdOrSlotOrSim === "object") {
      slotKey = `slot_${subIdOrSlotOrSim.simSlotIndex}`;
      subKey = subIdOrSlotOrSim.subscriptionId.toString();
    } else {
      const keyStr = subIdOrSlotOrSim.toString();
      if (keyStr.startsWith("slot_")) {
        slotKey = keyStr;
        const slotIdx = parseInt(keyStr.replace("slot_", ""), 10);
        const match = simCards.find((s) => s.simSlotIndex === slotIdx);
        if (match) subKey = match.subscriptionId.toString();
      } else {
        subKey = keyStr;
        const subIdNum = parseInt(keyStr, 10);
        const match = simCards.find((s) => s.subscriptionId === subIdNum);
        if (match) slotKey = `slot_${match.simSlotIndex}`;
      }
    }

    const updatedOps = { ...simOperators };
    const updatedLabels = { ...simLabels };

    if (slotKey) {
      updatedOps[slotKey] = operatorName;
      updatedLabels[slotKey] = phoneNumber;
    }
    if (subKey) {
      updatedOps[subKey] = operatorName;
      updatedLabels[subKey] = phoneNumber;
    }

    _setSimOperators(updatedOps);
    _setSimLabels(updatedLabels);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.simOperators, JSON.stringify(updatedOps)),
      AsyncStorage.setItem(STORAGE_KEYS.simLabels, JSON.stringify(updatedLabels)),
    ]);
  };

  const loadContacts = async (storedContactsStr: string | null) => {
    try {
      // 1. Immediately hydrate with cached contacts
      if (storedContactsStr) {
        try {
          const stored: Contact[] = JSON.parse(storedContactsStr);
          if (Array.isArray(stored) && stored.length > 0) {
            _setContacts(stored);
          }
        } catch (e) {}
      }

      // 2. Request Android device phonebook access
      if (Platform.OS === "android") {
        try {
          const hasContactsPerm = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS
          );
          if (!hasContactsPerm) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_CONTACTS
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
          }
        } catch (permErr: any) {
          console.log("Contacts permission check skipped (background):", permErr?.message);
          return;
        }
      }

      // High-performance query: skip photos/thumbnails to avoid memory spikes and bridge freezing
      const deviceContacts =
        typeof Contacts.getAllWithoutPhotos === "function"
          ? await Contacts.getAllWithoutPhotos()
          : await Contacts.getAll();

      const formatted: Contact[] = (deviceContacts || [])
        .filter((c) => c && c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => ({
          id: c.recordID || String(Math.random()),
          name: c.displayName || `${c.givenName || ""} ${c.familyName || ""}`.trim() || "Customer",
          number: (c.phoneNumbers[0]?.number || "").replace(/[^0-9+]/g, ""),
          blocked: false,
        }))
        .filter((c) => c.number.length >= 7);

      if (formatted.length > 0) {
        if (storedContactsStr) {
          try {
            const stored: Contact[] = JSON.parse(storedContactsStr);
            // Fast O(1) indexed lookups
            const storedMapById = new Map<string, Contact>();
            const storedMapByNum = new Map<string, Contact>();
            for (const s of stored) {
              if (s.id) storedMapById.set(s.id, s);
              if (s.number) {
                const clean = s.number.replace(/[^0-9+]/g, "");
                if (clean) storedMapByNum.set(clean, s);
              }
            }

            const deviceNums = new Set(formatted.map((c) => c.number));
            const manualExtras = stored.filter(
              (s) => s.id.startsWith("manual_") || s.id.startsWith("fav_") || !deviceNums.has(s.number.replace(/[^0-9+]/g, ""))
            );
            const merged = [
              ...formatted.map((c) => {
                const match = storedMapById.get(c.id) || storedMapByNum.get(c.number);
                return match ? { ...c, blocked: match.blocked, favorite: match.favorite } : c;
              }),
              ...manualExtras,
            ];
            _setContacts(merged);
            await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(merged));
            return;
          } catch (e) {}
        }
        _setContacts(formatted);
        await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(formatted));
      }
    } catch (e) {
      console.error("Error loading contacts:", e);
    }
  };

  const addManualContact = async (name: string, number: string) => {
    const cleanNumber = number.replace(/[^0-9+]/g, "");
    if (!cleanNumber) return;
    const newContact: Contact = {
      id: "manual_" + Date.now(),
      name: name.trim() || "Customer",
      number: cleanNumber,
      blocked: false,
    };
    const updated = [newContact, ...contacts.filter((c) => c.number !== cleanNumber)];
    _setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated));
  };

  const replaceTags = (template: string, recipientName?: string): string => {
    return template
      .replace(/{name}/gi, recipientName || "Valued Customer")
      .replace(/{business_name}/gi, profile.businessName || "Our Business")
      .replace(/{owner_name}/gi, profile.ownerName || "")
      .replace(/{phone}/gi, profile.phone || "")
      .replace(/{whatsapp}/gi, profile.whatsapp || profile.phone || "")
      .replace(/{maps_link}/gi, profile.mapsLink || "")
      .replace(/{catalog_link}/gi, profile.catalogLink || "")
      .replace(/{tagline}/gi, profile.tagline || "");
  };

  const updateProfile = async (newProfile: BusinessProfile) => {
    _setProfile(newProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(newProfile));
    syncToNative(automations, newProfile, contacts);
  };

  const updateAutomations = async (newAuto: AutomationSettings) => {
    _setAutomations(newAuto);
    await AsyncStorage.setItem(STORAGE_KEYS.automations, JSON.stringify(newAuto));
    syncToNative(newAuto, profile, contacts);
  };

  const getSimQuotaUsed = (sim: SimCardInfo): number => {
    const today = getLocalTodayString();
    if (quotaState.lastResetDate !== today) {
      return 0;
    }

    const slotKey = `slot_${sim.simSlotIndex}`;
    const subKey = sim.subscriptionId.toString();

    // Check directly saved quota count for slot or subscription ID
    const slotCount = quotaState.simCounts[slotKey] ?? 0;
    const subCount = quotaState.simCounts[subKey] ?? 0;
    let manualOrSysCount = Math.max(slotCount, subCount);

    // Sum all SMS segments/parts for messages sent today through this SIM
    const inAppSentToday = logs
      .filter(
        (l) =>
          l.status === "sent" &&
          isLocalToday(l.timestamp || l.id) &&
          (l.simSlotIndex === sim.simSlotIndex ||
            (l.subscriptionId !== undefined && l.subscriptionId === sim.subscriptionId) ||
            (l.simSlotIndex === undefined && l.subscriptionId === undefined && sim.simSlotIndex === 0))
      )
      .reduce((acc, l) => acc + (l.parts || 1), 0);

    // If there's an unassigned system count under key "-1", attribute to primary/selected SIM
    const unassignedCount = quotaState.simCounts["-1"] || 0;
    const isPrimaryOrSelected =
      sim.subscriptionId === automations.selectedSimId ||
      sim.simSlotIndex === 0;

    if (isPrimaryOrSelected && unassignedCount > 0 && manualOrSysCount === 0) {
      manualOrSysCount = unassignedCount;
    }

    return Math.max(manualOrSysCount, inAppSentToday);
  };

  const getSimQuotaRemaining = (sim: SimCardInfo): number => {
    const used = getSimQuotaUsed(sim);
    const limit = quotaState.dailyLimit || 100;
    return Math.max(limit - used, 0);
  };

  const getRemainingQuota = (simId?: number): number => {
    const targetSim =
      simId !== undefined && simId >= 0
        ? simCards.find((s) => s.subscriptionId === simId || s.simSlotIndex === simId) || getSelectedSim()
        : getSelectedSim();
    return getSimQuotaRemaining(targetSim);
  };

  const setSimQuotaUsed = async (
    subIdOrSlotOrSim: number | string | SimCardInfo,
    newCount: number
  ) => {
    const today = getLocalTodayString();
    const currentCounts = quotaState.lastResetDate === today ? { ...quotaState.simCounts } : {};

    let slotKey = "";
    let subKey = "";

    if (typeof subIdOrSlotOrSim === "object") {
      slotKey = `slot_${subIdOrSlotOrSim.simSlotIndex}`;
      subKey = subIdOrSlotOrSim.subscriptionId.toString();
    } else {
      const keyStr = subIdOrSlotOrSim.toString();
      if (keyStr.startsWith("slot_")) {
        slotKey = keyStr;
        const slotIdx = parseInt(keyStr.replace("slot_", ""), 10);
        const match = simCards.find((s) => s.simSlotIndex === slotIdx);
        if (match) subKey = match.subscriptionId.toString();
      } else {
        subKey = keyStr;
        const subIdNum = parseInt(keyStr, 10);
        const match = simCards.find((s) => s.subscriptionId === subIdNum);
        if (match) slotKey = `slot_${match.simSlotIndex}`;
      }
    }

    const safeCount = Math.max(0, newCount);
    if (slotKey) currentCounts[slotKey] = safeCount;
    if (subKey) currentCounts[subKey] = safeCount;

    const updated: SimQuotaState = {
      ...quotaState,
      lastResetDate: today,
      dailyLimit: quotaState.dailyLimit || 100,
      safetyReserve: quotaState.safetyReserve ?? 5,
      simCounts: currentCounts,
    };
    _setQuotaState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
  };

  /**
   * Aligns BizSMS quota counter directly with MyJio, Airtel Thanks, or carrier balance.
   * Can accept either used SMS count OR remaining SMS count.
   */
  const alignQuotaWithCarrier = async (
    sim: SimCardInfo,
    data: { used?: number; remaining?: number; source?: string }
  ) => {
    const limit = quotaState.dailyLimit || 100;
    let computedUsed = 0;
    if (data.used !== undefined) {
      computedUsed = Math.max(0, data.used);
    } else if (data.remaining !== undefined) {
      computedUsed = Math.max(0, limit - Math.max(0, data.remaining));
    }

    const today = getLocalTodayString();
    const currentCounts = quotaState.lastResetDate === today ? { ...quotaState.simCounts } : {};

    const slotKey = `slot_${sim.simSlotIndex}`;
    const subKey = sim.subscriptionId.toString();

    currentCounts[slotKey] = computedUsed;
    currentCounts[subKey] = computedUsed;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const updated: SimQuotaState = {
      ...quotaState,
      lastResetDate: today,
      dailyLimit: limit,
      safetyReserve: quotaState.safetyReserve ?? 5,
      simCounts: currentCounts,
      lastAlignedTime: timeStr,
      lastAlignedSource: data.source || "MyJio / Airtel",
    };

    _setQuotaState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
  };

  const resetSimQuota = async (subIdOrSlotOrSim?: number | string | SimCardInfo) => {
    const today = getLocalTodayString();
    if (!subIdOrSlotOrSim) {
      // Reset all SIMs
      const resetAll: SimQuotaState = {
        lastResetDate: today,
        dailyLimit: quotaState.dailyLimit || 100,
        safetyReserve: quotaState.safetyReserve ?? 5,
        simCounts: {},
      };
      _setQuotaState(resetAll);
      await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(resetAll));
      return;
    }

    await setSimQuotaUsed(subIdOrSlotOrSim, 0);
  };

  const setDailyLimit = async (limit: number) => {
    const updated: SimQuotaState = {
      ...quotaState,
      dailyLimit: limit,
    };
    _setQuotaState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
  };

  const setSafetyReserve = async (reserve: number) => {
    const updated: SimQuotaState = {
      ...quotaState,
      safetyReserve: Math.max(0, reserve),
    };
    _setQuotaState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
  };

  const incrementQuota = async (simId?: number, partsCount: number = 1) => {
    const today = getLocalTodayString();
    const currentCounts = quotaState.lastResetDate === today ? { ...quotaState.simCounts } : {};

    const targetSim =
      simId !== undefined && simId >= 0
        ? simCards.find((s) => s.subscriptionId === simId || s.simSlotIndex === simId) || getSelectedSim()
        : getSelectedSim();

    const slotKey = `slot_${targetSim.simSlotIndex}`;
    const subKey = targetSim.subscriptionId.toString();

    const addParts = Math.max(1, partsCount);
    currentCounts[slotKey] = (currentCounts[slotKey] || 0) + addParts;
    currentCounts[subKey] = (currentCounts[subKey] || 0) + addParts;

    const updated: SimQuotaState = {
      ...quotaState,
      lastResetDate: today,
      dailyLimit: quotaState.dailyLimit || 100,
      safetyReserve: quotaState.safetyReserve ?? 5,
      simCounts: currentCounts,
    };
    _setQuotaState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.quota, JSON.stringify(updated));
  };

  const resetTodayQuota = async () => {
    await resetSimQuota();
  };

  const addLog = async (logData: Omit<Log, "id" | "timestamp">) => {
    const activeSim = getSelectedSim();
    const newLog: Log = {
      ...logData,
      id: Date.now(),
      simSlotIndex: logData.simSlotIndex !== undefined ? logData.simSlotIndex : activeSim.simSlotIndex,
      subscriptionId: logData.subscriptionId !== undefined ? logData.subscriptionId : activeSim.subscriptionId,
      simName: logData.simName || getSimDisplayLabel(activeSim),
      parts: logData.parts || 1,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs];
    _setLogs(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(updated));
  };

  const retryFailedLog = async (id: number): Promise<boolean> => {
    const targetLog = logs.find((l) => l.id === id);
    if (!targetLog) return false;

    const res = await sendTheSms(targetLog.number, targetLog.message, automations.selectedSimId);
    const usedParts = res.parts || 1;
    const updatedLogs: Log[] = logs.map((l) =>
      l.id === id ? { ...l, status: res.success ? "sent" : "failed", parts: usedParts } : l
    );
    _setLogs(updatedLogs);
    await AsyncStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(updatedLogs));
    if (res.success) {
      await incrementQuota(automations.selectedSimId, usedParts);
    }
    return res.success;
  };

  const clearLogs = async () => {
    _setLogs([]);
    await AsyncStorage.setItem(STORAGE_KEYS.logs, JSON.stringify([]));
  };

  const createCampaign = async (
    campaignData: Omit<Campaign, "id" | "status" | "sentCount" | "createdAt">
  ): Promise<Campaign> => {
    const newCampaign: Campaign = {
      ...campaignData,
      id: Date.now().toString(),
      status: "scheduled",
      sentCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCampaign, ...campaigns];
    _setCampaigns(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.campaigns, JSON.stringify(updated));
    return newCampaign;
  };

  const cancelCampaign = async (id: string) => {
    const updated: Campaign[] = campaigns.map((c) =>
      c.id === id ? { ...c, status: "cancelled" as const } : c
    );
    _setCampaigns(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.campaigns, JSON.stringify(updated));
  };

  const executeCampaignNow = async (id: string, directCamp?: Campaign) => {
    let camp = directCamp || campaigns.find((c) => c.id === id);
    if (!camp) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.campaigns);
        if (stored) {
          const list: Campaign[] = JSON.parse(stored);
          camp = list.find((c) => c.id === id);
        }
      } catch (e) {}
    }
    if (!camp || camp.status === "completed") return;

    _setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "running" as const } : c))
    );

    let sent = camp.sentCount;
    const activeSim = getSelectedSim();

    for (const phone of camp.targetNumbers) {
      const matchContact = contacts.find((c) => c.number === phone);
      const personalizedMsg = replaceTags(camp.message, matchContact?.name);

      const res = await sendTheSms(phone, personalizedMsg, automations.selectedSimId);
      const usedParts = res.parts || 1;
      if (res.success) {
        sent += 1;
        await incrementQuota(automations.selectedSimId, usedParts);
        await addLog({
          number: phone,
          message: personalizedMsg,
          status: "sent",
          trigger: "campaign",
          parts: usedParts,
          simSlotIndex: activeSim.simSlotIndex,
          subscriptionId: activeSim.subscriptionId,
          simName: getSimDisplayLabel(activeSim),
        });
      } else {
        await addLog({
          number: phone,
          message: personalizedMsg,
          status: "failed",
          trigger: "campaign",
          parts: usedParts,
          simSlotIndex: activeSim.simSlotIndex,
          subscriptionId: activeSim.subscriptionId,
          simName: getSimDisplayLabel(activeSim),
        });
      }

      await new Promise((resolve) => setTimeout(() => resolve(undefined), 800));
    }

    const finished: Campaign[] = campaigns.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "completed" as const,
            sentCount: sent,
          }
        : c
    );
    _setCampaigns(finished);
    await AsyncStorage.setItem(STORAGE_KEYS.campaigns, JSON.stringify(finished));
  };

  const blockContact = async (id: string) => {
    const updated = contacts.map((c) => (c.id === id ? { ...c, blocked: true } : c));
    _setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated));
    syncToNative(automations, profile, updated);
  };

  const unblockContact = async (id: string) => {
    const updated = contacts.map((c) => (c.id === id ? { ...c, blocked: false } : c));
    _setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated));
    syncToNative(automations, profile, updated);
  };

  const toggleFavoriteContact = async (idOrNumber: string) => {
    const cleanNum = idOrNumber.replace(/[^0-9+]/g, "").trim();
    const updated = contacts.map((c) => {
      const match =
        c.id === idOrNumber ||
        (cleanNum && c.number.replace(/[^0-9+]/g, "").trim() === cleanNum);
      return match ? { ...c, favorite: !c.favorite } : c;
    });
    _setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated));
  };

  const updateFavoritesBulk = async (numbersOrIds: string[], isFavorite: boolean) => {
    const cleanNumbers = new Set(
      numbersOrIds.map((n) => n.replace(/[^0-9+]/g, "").trim())
    );
    const existingMatches = new Set<string>();

    const updated = contacts.map((c) => {
      const cClean = c.number.replace(/[^0-9+]/g, "").trim();
      if (cleanNumbers.has(cClean) || cleanNumbers.has(c.id)) {
        existingMatches.add(cClean);
        return { ...c, favorite: isFavorite };
      }
      return c;
    });

    const newContacts: Contact[] = [];
    if (isFavorite) {
      for (const raw of numbersOrIds) {
        const clean = raw.replace(/[^0-9+]/g, "").trim();
        if (
          clean.length >= 7 &&
          !existingMatches.has(clean) &&
          !updated.some((c) => c.number.replace(/[^0-9+]/g, "").trim() === clean)
        ) {
          newContacts.push({
            id: "fav_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            name: `VIP (${clean.slice(-4)})`,
            number: clean,
            blocked: false,
            favorite: true,
          });
        }
      }
    }

    const finalContacts = [...newContacts, ...updated];
    _setContacts(finalContacts);
    await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(finalContacts));
  };

  const refreshContacts = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.contacts);
    await loadContacts(stored);
  };

  const setTemplates = async (newTemplates: Templates) => {
    _setTemplates(newTemplates);
    await AsyncStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(newTemplates));
  };

  const resendMessage = async (id: number) => {
    await retryFailedLog(id);
  };

  const refreshLogs = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.logs);
    if (stored) _setLogs(JSON.parse(stored));
  };

  const refreshCounter = async (): Promise<number> => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.logs);
    if (stored) {
      const parsed: Log[] = JSON.parse(stored);
      return parsed.filter((l) => l.status === "sent").length;
    }
    return 0;
  };

  return (
    <AppContext.Provider
      value={{
        simCards,
        refreshSimCards: fetchSimCards,
        syncSystemSmsQuota,
        quotaState,
        getRemainingQuota,
        getSimQuotaUsed,
        getSimQuotaRemaining,
        setSimQuotaUsed,
        alignQuotaWithCarrier,
        resetSimQuota,
        setDailyLimit,
        setSafetyReserve,
        incrementQuota,
        resetTodayQuota,
        setSelectedSimId,
        getSelectedSim,
        getSimDisplayLabel,
        getSimOperator,
        getSimPhoneNumber,
        simLabels,
        simOperators,
        setSimLabel,
        setSimDetails,
        profile,
        updateProfile,
        replaceTags,
        automations,
        updateAutomations,
        campaigns,
        createCampaign,
        cancelCampaign,
        executeCampaignNow,
        contacts,
        blockContact,
        unblockContact,
        refreshContacts,
        addManualContact,
        toggleFavoriteContact,
        updateFavoritesBulk,
        logs,
        addLog,
        retryFailedLog,
        clearLogs,
        templates,
        setTemplates,
        resendMessage,
        refreshLogs,
        refreshCounter,
        clientUser,
        authenticated,
        setAuthenticated: _setAuthenticated,
        logoutClient,
        refreshClientStatus,
        syncClientProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
