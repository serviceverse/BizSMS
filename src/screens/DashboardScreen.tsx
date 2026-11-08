import React, { useContext, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Image,
  Platform,
  NativeModules,
} from "react-native";
import {
  Text,
  Card,
  Switch,
  Button,
  Appbar,
  Chip,
  Divider,
  TextInput,
} from "react-native-paper";
import {
  PhoneMissed,
  PhoneCall,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Check,
  Edit2,
  Smartphone,
  Radio,
  PhoneForwarded,
  ShieldCheck,
  Globe,
  ExternalLink,
  Zap,
} from "lucide-react-native";
import { AppContext, isLocalToday } from "../context/AppContext";
import { SimCardInfo, getCarrierBalanceInfo } from "../services/smsService";
import { colors } from "../theme/theme";

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const {
    profile,
    automations,
    updateAutomations,
    simCards,
    refreshSimCards,
    setSelectedSimId,
    getSelectedSim,
    getSimOperator,
    getSimPhoneNumber,
    setSimDetails,
    logs,
  } = useContext(AppContext);

  // Edit SIM Details Modal State
  const [editingSim, setEditingSim] = useState<SimCardInfo | null>(null);
  const [editingOperator, setEditingOperator] = useState("");
  const [editingNumber, setEditingNumber] = useState("");

  const selectedSim = getSelectedSim();
  const selectedOperator = getSimOperator(selectedSim);
  const selectedPhone = getSimPhoneNumber(selectedSim);

  // Stats calculation for BizSMS activity
  const todayLogs = logs.filter((l) => isLocalToday(l.timestamp || l.id));
  const todaySent = todayLogs.filter((l) => l.status === "sent").length;
  const todayFailed = todayLogs.filter((l) => l.status === "failed").length;

  const toggleMissedCall = () => {
    updateAutomations({
      ...automations,
      missedCallEnabled: !automations.missedCallEnabled,
    });
  };

  const toggleCallEnded = () => {
    updateAutomations({
      ...automations,
      callEndedEnabled: !automations.callEndedEnabled,
    });
  };

  const openEditSim = (sim: SimCardInfo) => {
    setEditingSim(sim);
    setEditingOperator(getSimOperator(sim));
    setEditingNumber(getSimPhoneNumber(sim));
  };

  const saveSimDetails = async () => {
    if (editingSim) {
      await setSimDetails(editingSim, editingOperator.trim(), editingNumber.trim());
      setEditingSim(null);
    }
  };

  const dialCarrierCode = (code: string) => {
    const cleanCode = code.replace(/#/g, "%23");
    Linking.openURL(`tel:${cleanCode}`).catch((e) =>
      Alert.alert("Dialer Notice", "Could not dial directly: " + e.message)
    );
  };

  const handleCheckBatteryOptimization = async () => {
    if (Platform.OS !== "android") return;
    try {
      const { CallModule } = NativeModules;
      if (CallModule && CallModule.requestIgnoreBatteryOptimization) {
        await CallModule.requestIgnoreBatteryOptimization();
      } else {
        Linking.openSettings();
      }
    } catch {
      Linking.openSettings();
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={styles.headerLogoBadge}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.headerLogoImg}
              resizeMode="contain"
            />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.brandSubtitle}>BizSMS</Text>
              <Text style={styles.headerByCompany}>• The Serviceverse</Text>
            </View>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {profile.businessName || "My Business"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => refreshSimCards()}
        >
          <RefreshCcw color="#2563EB" size={20} />
        </TouchableOpacity>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Active Selected SIM Banner */}
        <Card style={styles.activeSimBanner}>
          <Card.Content>
            <View style={styles.activeSimTopRow}>
              <View style={styles.activeSimBadge}>
                <Smartphone color="#FFFFFF" size={16} />
                <Text style={styles.activeSimBadgeText}>
                  ACTIVE SENDER SIM & OPERATOR
                </Text>
              </View>
              <View style={styles.livePulse} />
            </View>

            <View style={styles.activeSimDetails}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={styles.activeSlotBadge}>
                  SIM {selectedSim.simSlotIndex + 1}
                </Text>
                <View style={styles.operatorPill}>
                  <Radio color="#FFFFFF" size={12} />
                  <Text style={styles.operatorPillText}>
                    OPERATOR: {selectedOperator.toUpperCase()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                onPress={() => openEditSim(selectedSim)}
              >
                <Text style={styles.activeSimName}>
                  {selectedPhone ? selectedPhone : "+ Set Phone Number"} ({selectedOperator})
                </Text>
                <Edit2 color="#93C5FD" size={16} />
              </TouchableOpacity>

              <Text style={styles.activeSimSub}>
                All automated missed call replies & post-call cards are dispatched through your {selectedOperator} plan.
              </Text>

              {/* Status Pill */}
              <View style={styles.bannerStatusPill}>
                <CheckCircle2 color="#86EFAC" size={14} />
                <Text style={styles.bannerStatusText}>
                  Status: Connected & Ready to Send
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Dual-SIM Switcher Buttons */}
        <View style={styles.quickSimSwitcherContainer}>
          <Text style={styles.quickSwitcherTitle}>
            CHOOSE OPERATOR / SIM FOR SMS:
          </Text>
          <View style={styles.quickSimSwitcher}>
            {simCards.map((sim) => {
              const isSelected =
                automations.selectedSimId === sim.subscriptionId ||
                automations.selectedSimId === sim.simSlotIndex ||
                (automations.selectedSimId < 0 && sim === selectedSim);
              const op = getSimOperator(sim);
              const phone = getSimPhoneNumber(sim);

              return (
                <TouchableOpacity
                  key={sim.subscriptionId}
                  style={[
                    styles.quickSimBtn,
                    isSelected && styles.quickSimBtnActive,
                  ]}
                  onPress={() => setSelectedSimId(sim.subscriptionId)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {isSelected ? (
                      <CheckCircle2 color="#2563EB" size={18} />
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                    <Text
                      style={[
                        styles.quickSimBtnText,
                        isSelected && styles.quickSimBtnTextActive,
                      ]}
                    >
                      SIM {sim.simSlotIndex + 1}
                    </Text>
                  </View>

                  {/* Prominent Operator Name */}
                  <View style={[styles.operatorBox, isSelected && styles.operatorBoxActive]}>
                    <Text style={[styles.operatorBoxText, isSelected && { color: "#1D4ED8" }]}>
                      📶 {op.toUpperCase()}
                    </Text>
                  </View>

                  {phone ? (
                    <Text style={styles.quickSimNumber} numberOfLines={1}>
                      {phone}
                    </Text>
                  ) : (
                    <Text style={styles.quickSimNumberPrompt}>+ Set Number</Text>
                  )}

                  {isSelected ? (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ACTIVE SENDER</Text>
                    </View>
                  ) : (
                    <Text style={styles.tapToSwitchText}>Tap to switch</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SIM Cards & Carrier Status Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>📶 SIM Cards & Sender Setup</Text>
          <TouchableOpacity onPress={() => refreshSimCards()}>
            <Text style={styles.sectionHint}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {simCards.map((sim) => {
          const isSelected =
            automations.selectedSimId === sim.subscriptionId ||
            automations.selectedSimId === sim.simSlotIndex ||
            (automations.selectedSimId < 0 && sim === selectedSim);

          const op = getSimOperator(sim);
          const phone = getSimPhoneNumber(sim);
          const carrierInfo = getCarrierBalanceInfo(op);

          return (
            <TouchableOpacity
              key={sim.subscriptionId}
              activeOpacity={0.9}
              onPress={() => setSelectedSimId(sim.subscriptionId)}
            >
              <Card
                style={[
                  styles.simCard,
                  isSelected && styles.simCardSelected,
                ]}
              >
                <Card.Content>
                  <View style={styles.simHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <Chip
                          style={[
                            styles.simSlotChip,
                            isSelected && { backgroundColor: "#2563EB" },
                          ]}
                          textStyle={[
                            styles.simSlotText,
                            isSelected && { color: "#FFFFFF" },
                          ]}
                        >
                          SIM {sim.simSlotIndex + 1}
                        </Chip>

                        {/* High-visibility Operator Badge */}
                        <View style={styles.cardOperatorBadge}>
                          <Text style={styles.cardOperatorText}>{op}</Text>
                        </View>

                        {isSelected && (
                          <View style={styles.activeTag}>
                            <Check color="#16A34A" size={14} />
                            <Text style={styles.activeTagText}>ACTIVE SENDER</Text>
                          </View>
                        )}
                      </View>

                      {/* Display phone number with edit button */}
                      <TouchableOpacity
                        style={styles.phoneNumberRow}
                        onPress={() => openEditSim(sim)}
                      >
                        <Text style={styles.phoneNumberText}>
                          {phone ? `📞 ${phone}` : "📞 Tap to set phone / operator"}
                        </Text>
                        <Edit2 color="#64748B" size={13} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 1-Tap Carrier Balance Check Shortcut */}
                  <View style={styles.carrierCheckRow}>
                    <TouchableOpacity
                      style={styles.checkBalanceBtn}
                      onPress={() => dialCarrierCode(carrierInfo.ussdOrDialCode)}
                    >
                      <PhoneForwarded color="#2563EB" size={14} />
                      <Text style={styles.checkBalanceBtnText}>
                        Check {carrierInfo.appName} Balance (Dial {carrierInfo.ussdOrDialCode})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Switch to this SIM Action */}
                  <View style={styles.simFooter}>
                    {!isSelected ? (
                      <Button
                        mode="outlined"
                        onPress={() => setSelectedSimId(sim.subscriptionId)}
                        compact
                        textColor={colors.primary}
                        style={[styles.switchSimBtn, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryLight }]}
                      >
                        Switch to {op} (SIM {sim.simSlotIndex + 1})
                      </Button>
                    ) : (
                      <View style={styles.currentlySelectedRow}>
                        <CheckCircle2 color="#16A34A" size={16} />
                        <Text style={styles.currentlySelectedText}>
                          Active sender for automated replies & broadcasts
                        </Text>
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Carrier Safety & Privacy Note */}
        <Card style={styles.telecomNoticeCard}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <ShieldCheck color="#2563EB" size={18} />
              <Text style={styles.telecomNoticeTitle}>
                Direct Cellular Dispatch
              </Text>
            </View>
            <Text style={styles.telecomNoticeText}>
              • Messages are dispatched directly through your chosen SIM card using your carrier plan.
            </Text>
            <Text style={styles.telecomNoticeText}>
              • You can verify your live balance anytime directly in your official operator application ({getCarrierBalanceInfo(selectedOperator).appName}) or by tapping the dial shortcut above.
            </Text>
          </Card.Content>
        </Card>

        {/* Lock Screen & Deep Sleep Background Auto-Pilot Status */}
        <Card style={styles.backgroundActiveCard}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <View style={styles.sleepIconBox}>
                  <Zap color="#10B981" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sleepCardTitle}>Lock Screen & Sleep Auto-Pilot</Text>
                  <Text style={styles.sleepCardStatus}>● Native Android Receiver Active</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.batteryOptBtn}
                onPress={handleCheckBatteryOptimization}
                activeOpacity={0.8}
              >
                <Text style={styles.batteryOptBtnText}>Battery Rules</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sleepCardDesc}>
              BizSMS runs in the background even when your phone is locked, asleep, or the app is closed. Incoming missed calls automatically trigger cellular SMS responses.
            </Text>
          </Card.Content>
        </Card>

        {/* Quick Automations Toggles */}
        <Text style={styles.sectionHeader}>⚡ Quick Automation Toggles</Text>

        <Card style={styles.toggleCard}>
          <Card.Content>
            {/* Missed Call Rule */}
            <View style={styles.toggleRow}>
              <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
                <PhoneMissed color="#DC2626" size={22} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.toggleTitle}>Missed Call Auto-Responder</Text>
                <Text style={styles.toggleDesc}>
                  Auto-text personalized reply when you're busy
                </Text>
              </View>
              <Switch
                value={automations.missedCallEnabled}
                onValueChange={toggleMissedCall}
                color="#2563EB"
              />
            </View>

            <Divider style={styles.divider} />

            {/* Post-Call Card Rule */}
            <View style={styles.toggleRow}>
              <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
                <PhoneCall color="#16A34A" size={22} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.toggleTitle}>Post-Call Brand & Thank You</Text>
                <Text style={styles.toggleDesc}>
                  Send visiting card & Google map link after call
                </Text>
              </View>
              <Switch
                value={automations.callEndedEnabled}
                onValueChange={toggleCallEnded}
                color="#2563EB"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Today's Activity */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>📊 Today's Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Logs")}>
            <Text style={styles.sectionHint}>View Audit Logs →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.kpiRow}>
          <TouchableOpacity
            style={[styles.kpiCardWrapper, { marginRight: 8 }]}
            onPress={() => navigation.navigate("Logs")}
          >
            <Card style={styles.kpiCard}>
              <Card.Content style={styles.kpiContent}>
                <CheckCircle2 color="#10B981" size={24} />
                <Text style={styles.kpiNumber}>{todaySent}</Text>
                <Text style={styles.kpiLabel}>Messages Delivered</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCardWrapper, { marginLeft: 8 }]}
            onPress={() => navigation.navigate("Logs")}
          >
            <Card style={styles.kpiCard}>
              <Card.Content style={styles.kpiContent}>
                <AlertTriangle color="#F59E0B" size={24} />
                <Text style={styles.kpiNumber}>{todayFailed}</Text>
                <Text style={styles.kpiLabel}>Failed / Skipped</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Quick Action Shortcuts */}
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            icon={() => <Sparkles color="white" size={18} />}
            onPress={() => navigation.navigate("Campaigns")}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.actionBtn}
            contentStyle={{ paddingVertical: 4 }}
          >
            Festival Broadcast
          </Button>

          <Button
            mode="outlined"
            icon={() => <CreditCard color={colors.primary} size={18} />}
            onPress={() => navigation.navigate("Profile")}
            textColor={colors.primary}
            style={[styles.actionBtn, { borderColor: colors.primary }]}
            contentStyle={{ paddingVertical: 4 }}
          >
            Digital Card
          </Button>
        </View>

        {/* Parent Company Branding & Copyright Card */}
        <Card style={styles.companyCard}>
          <Card.Content>
            <View style={styles.companyHeaderRow}>
              <View style={styles.companyLogoBadge}>
                <Image
                  source={require("../assets/logo.png")}
                  style={styles.companyLogoImg}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.companyProductName}>BizSMS</Text>
                <Text style={styles.companyProductTag}>
                  Commercial Call Auto-Pilot & Cellular Route
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.companyInfoRow}>
              <Text style={styles.parentCompanyLabel}>Parent Company:</Text>
              <Text style={styles.parentCompanyName}>The Serviceverse</Text>
            </View>

            <TouchableOpacity
              style={styles.websitePill}
              onPress={() => Linking.openURL("https://theserviceverse.com")}
              activeOpacity={0.8}
            >
              <Globe color="#2563EB" size={14} />
              <Text style={styles.websitePillText}>theserviceverse.com</Text>
              <ExternalLink color="#2563EB" size={12} />
            </TouchableOpacity>

            <Text style={styles.copyrightNotice}>
              © {new Date().getFullYear()} The Serviceverse. All rights reserved.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Edit SIM Details (Operator Name & Phone Number) Modal */}
      <Modal
        visible={editingSim !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSim(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.editModalCard}>
            <Card.Content>
              <Text style={styles.modalTitle}>
                {editingSim ? `Configure SIM ${editingSim.simSlotIndex + 1}` : "Set SIM Details"}
              </Text>
              <Text style={styles.modalSubtitle}>
                Customize your telecom carrier name (Jio, Airtel, Vi, BSNL) and your actual mobile number.
              </Text>

              <TextInput
                mode="outlined"
                label="Operator Name (e.g. Jio 4G, Airtel, Vi, BSNL)"
                value={editingOperator}
                onChangeText={setEditingOperator}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={{ marginBottom: 12, backgroundColor: colors.bgInput }}
              />

              <TextInput
                mode="outlined"
                label="Phone Number (e.g. +91 98765 43210)"
                value={editingNumber}
                onChangeText={setEditingNumber}
                keyboardType="phone-pad"
                placeholder="Enter 10-digit mobile number"
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={{ marginBottom: 16, backgroundColor: colors.bgInput }}
              />

              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                <Button
                  onPress={() => setEditingSim(null)}
                  textColor={colors.textMuted}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={saveSimDetails}
                  buttonColor={colors.primary}
                  textColor="#FFFFFF"
                  style={{ borderRadius: 8 }}
                >
                  Save Details
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    paddingHorizontal: 16,
  },
  headerLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00051B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    overflow: "hidden",
  },
  headerLogoImg: {
    width: "100%",
    height: "100%",
  },
  headerByCompany: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  companyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  companyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  companyLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00051B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    overflow: "hidden",
  },
  companyLogoImg: {
    width: "100%",
    height: "100%",
  },
  companyProductName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  companyProductTag: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  companyInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  parentCompanyLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  parentCompanyName: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "800",
  },
  websitePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 12,
  },
  websitePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  copyrightNotice: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
  headerAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeSimBanner: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    elevation: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  activeSimTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activeSimBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeSimBadgeText: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  activeSimDetails: {
    marginTop: 2,
  },
  activeSlotBadge: {
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  operatorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  operatorPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  activeSimName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  activeSimSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 16,
  },
  bannerStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  bannerStatusText: {
    fontSize: 12,
    color: "#86EFAC",
    fontWeight: "600",
  },
  quickSimSwitcherContainer: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickSwitcherTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  quickSimSwitcher: {
    flexDirection: "row",
    gap: 10,
  },
  quickSimBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  quickSimBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    elevation: 2,
  },
  quickSimBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  quickSimBtnTextActive: {
    color: "#2563EB",
  },
  unselectedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#94A3B8",
  },
  operatorBox: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  operatorBoxActive: {
    backgroundColor: "#DBEAFE",
  },
  operatorBoxText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  quickSimNumber: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
  },
  quickSimNumberPrompt: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 2,
  },
  activePill: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  activePillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  tapToSwitchText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  simCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    elevation: 2,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  simCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFF",
  },
  simHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  simSlotChip: {
    backgroundColor: "#EFF6FF",
    height: 26,
  },
  simSlotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardOperatorBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardOperatorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3730A3",
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  phoneNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  phoneNumberText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  carrierCheckRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  checkBalanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "flex-start",
  },
  checkBalanceBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  simFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  switchSimBtn: {
    borderRadius: 8,
  },
  currentlySelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentlySelectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
  telecomNoticeCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    borderColor: "#BAE6FD",
    borderWidth: 1,
    marginBottom: 12,
  },
  telecomNoticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369A1",
  },
  telecomNoticeText: {
    fontSize: 11,
    color: "#0C4A6E",
    lineHeight: 16,
    marginTop: 3,
  },
  backgroundActiveCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    marginBottom: 20,
  },
  sleepIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  sleepCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  sleepCardStatus: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    marginTop: 1,
  },
  batteryOptBtn: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  batteryOptBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  sleepCardDesc: {
    fontSize: 11,
    color: "#14532D",
    lineHeight: 16,
    marginTop: 8,
  },
  toggleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  toggleDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  kpiRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  kpiCardWrapper: {
    flex: 1,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    elevation: 2,
  },
  kpiContent: {
    alignItems: "center",
    paddingVertical: 14,
  },
  kpiNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  editModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },
});
