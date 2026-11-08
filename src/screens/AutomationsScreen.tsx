import React, { useContext, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Card,
  Switch,
  TextInput,
  Button,
  Appbar,
  Chip,
  Divider,
  RadioButton,
  HelperText,
} from "react-native-paper";
import {
  PhoneMissed,
  PhoneCall,
  Clock,
  Shield,
  Layers,
  Save,
  MessageSquare,
  Sparkles,
} from "lucide-react-native";
import { AppContext } from "../context/AppContext";
import { PRESET_TEMPLATES } from "../services/templatePresets";
import { calculateSmsParts } from "../services/smsService";
import RichTextEditor from "../components/RichTextEditor";
import { colors } from "../theme/theme";

export default function AutomationsScreen() {
  const {
    automations,
    updateAutomations,
    simCards,
    replaceTags,
    getSimDisplayLabel,
    getSimOperator,
    getSimPhoneNumber,
  } = useContext(AppContext);

  const [missedEnabled, setMissedEnabled] = useState(automations.missedCallEnabled);
  const [missedTemplate, setMissedTemplate] = useState(automations.missedCallTemplate);

  const [callEndedEnabled, setCallEndedEnabled] = useState(automations.callEndedEnabled);
  const [callEndedTemplate, setCallEndedTemplate] = useState(automations.callEndedTemplate);

  const [antiSpamHours, setAntiSpamHours] = useState(
    (automations.antiSpamHours || 24).toString()
  );
  const [workingHoursOnly, setWorkingHoursOnly] = useState(automations.workingHoursOnly);
  const [workStart, setWorkStart] = useState(automations.workingHoursStart || "09:00");
  const [workEnd, setWorkEnd] = useState(automations.workingHoursEnd || "20:00");
  const [selectedSim, setSelectedSim] = useState(automations.selectedSimId.toString());

  const [savedSuccess, setSavedSuccess] = useState(false);

  const insertTag = (tag: string, target: "missed" | "ended") => {
    if (target === "missed") {
      setMissedTemplate((prev) => prev + " " + tag);
    } else {
      setCallEndedTemplate((prev) => prev + " " + tag);
    }
  };

  const applyPreset = (msg: string, target: "missed" | "ended") => {
    if (target === "missed") {
      setMissedTemplate(msg);
    } else {
      setCallEndedTemplate(msg);
    }
  };

  const handleSave = async () => {
    await updateAutomations({
      missedCallEnabled: missedEnabled,
      missedCallTemplate: missedTemplate,
      callEndedEnabled: callEndedEnabled,
      callEndedTemplate: callEndedTemplate,
      antiSpamHours: parseInt(antiSpamHours, 10) || 24,
      workingHoursOnly,
      workingHoursStart: workStart,
      workingHoursEnd: workEnd,
      selectedSimId: parseInt(selectedSim, 10) || -1,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const TAGS = [
    "{name}",
    "{business_name}",
    "{whatsapp}",
    "{maps_link}",
    "{catalog_link}",
    "{phone}",
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Content
            title="Call Automations"
            subtitle="Configure automatic smart responses"
            titleStyle={styles.headerTitle}
          />
          <Button
            mode="contained"
            icon={() => <Save color="white" size={16} />}
            onPress={handleSave}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveHeaderBtn}
          >
            Save
          </Button>
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {savedSuccess && (
            <Card style={styles.successBanner}>
              <Text style={styles.successText}>
                ✅ Automation rules saved successfully!
              </Text>
            </Card>
          )}

          {/* 1. Missed Call Auto-Responder */}
          <Card style={styles.ruleCard}>
            <Card.Content>
              <View style={styles.ruleHeader}>
                <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
                  <PhoneMissed color="#DC2626" size={24} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ruleTitle}>Missed Call Responder</Text>
                  <Text style={styles.ruleSubtitle}>
                    Texts when a call is missed or unanswered
                  </Text>
                </View>
                <Switch
                  value={missedEnabled}
                  onValueChange={setMissedEnabled}
                  color="#2563EB"
                />
              </View>

              {missedEnabled && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>Pre-Built Industry Templates:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.presetScroll}
                  >
                    {PRESET_TEMPLATES.filter((p) => p.category === "missed_call").map(
                      (p) => (
                        <Chip
                          key={p.id}
                          style={styles.presetChip}
                          textStyle={styles.presetChipText}
                          onPress={() => applyPreset(p.message, "missed")}
                        >
                          {p.title}
                        </Chip>
                      )
                    )}
                  </ScrollView>

                  <Text style={styles.label}>✍️ Custom Styled Message Template:</Text>
                  <RichTextEditor
                    value={missedTemplate}
                    onChangeText={setMissedTemplate}
                    placeholder="Enter missed call auto-reply... Select text & tap Bold/Italic to customize!"
                    tags={TAGS}
                    minHeight={120}
                  />

                  {/* SMS Live Preview */}
                  <View style={styles.previewBox}>
                    <View style={styles.previewHeader}>
                      <MessageSquare color="#64748B" size={14} />
                      <Text style={styles.previewHeaderText}>Customer Phone Preview</Text>
                    </View>
                    <View style={styles.smsBubble}>
                      <Text style={styles.smsBubbleText}>
                        {replaceTags(missedTemplate, "Rahul Sharma")}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* 2. Post-Call Brand Card & Thank You */}
          <Card style={styles.ruleCard}>
            <Card.Content>
              <View style={styles.ruleHeader}>
                <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
                  <PhoneCall color="#16A34A" size={24} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ruleTitle}>Post-Call Brand Card</Text>
                  <Text style={styles.ruleSubtitle}>
                    Sends visiting card & review link after call ends
                  </Text>
                </View>
                <Switch
                  value={callEndedEnabled}
                  onValueChange={setCallEndedEnabled}
                  color="#2563EB"
                />
              </View>

              {callEndedEnabled && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>Pre-Built Industry Templates:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.presetScroll}
                  >
                    {PRESET_TEMPLATES.filter((p) => p.category === "call_ended").map(
                      (p) => (
                        <Chip
                          key={p.id}
                          style={styles.presetChip}
                          textStyle={styles.presetChipText}
                          onPress={() => applyPreset(p.message, "ended")}
                        >
                          {p.title}
                        </Chip>
                      )
                    )}
                  </ScrollView>

                  <Text style={styles.label}>✍️ Custom Styled Message Template:</Text>
                  <RichTextEditor
                    value={callEndedTemplate}
                    onChangeText={setCallEndedTemplate}
                    placeholder="Enter post-call visiting card message... Select text & tap Bold/Italic to customize!"
                    tags={TAGS}
                    minHeight={120}
                  />

                  {/* SMS Live Preview */}
                  <View style={styles.previewBox}>
                    <View style={styles.previewHeader}>
                      <MessageSquare color="#64748B" size={14} />
                      <Text style={styles.previewHeaderText}>Customer Phone Preview</Text>
                    </View>
                    <View style={styles.smsBubble}>
                      <Text style={styles.smsBubbleText}>
                        {replaceTags(callEndedTemplate, "Dr. Priya Patel")}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* 3. Smart Operating Rules */}
          <Text style={styles.sectionHeader}>🛡️ Smart Safeguards & Routing</Text>

          <Card style={styles.ruleCard}>
            <Card.Content>
              {/* Anti-Spam frequency */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Anti-Spam Cooldown</Text>
                  <Text style={styles.settingDesc}>
                    Don't text the same customer twice within this window
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={antiSpamHours}
                  onChangeText={setAntiSpamHours}
                  keyboardType="number-pad"
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textPlaceholder}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.numberInput}
                  right={<TextInput.Affix text="hrs" textStyle={{ color: colors.textMuted }} />}
                />
              </View>

              <Divider style={styles.divider} />

              {/* Working hours */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Business Hours Filter</Text>
                  <Text style={styles.settingDesc}>
                    Only send auto-replies during work hours
                  </Text>
                </View>
                <Switch
                  value={workingHoursOnly}
                  onValueChange={setWorkingHoursOnly}
                  color={colors.primary}
                />
              </View>

              {workingHoursOnly && (
                <View style={styles.hoursRow}>
                  <TextInput
                    mode="outlined"
                    label="Start (HH:MM)"
                    value={workStart}
                    onChangeText={setWorkStart}
                    textColor={colors.textPrimary}
                    placeholderTextColor={colors.textPlaceholder}
                    outlineColor={colors.borderInput}
                    activeOutlineColor={colors.primary}
                    style={{ flex: 1, marginRight: 8, backgroundColor: colors.bgInput }}
                  />
                  <TextInput
                    mode="outlined"
                    label="End (HH:MM)"
                    value={workEnd}
                    onChangeText={setWorkEnd}
                    textColor={colors.textPrimary}
                    placeholderTextColor={colors.textPlaceholder}
                    outlineColor={colors.borderInput}
                    activeOutlineColor={colors.primary}
                    style={{ flex: 1, marginLeft: 8, backgroundColor: colors.bgInput }}
                  />
                </View>
              )}

              <Divider style={styles.divider} />

              {/* SIM Routing */}
              <Text style={styles.settingTitle}>Preferred SIM Card & Number</Text>
              <Text style={styles.settingDesc}>
                Select which phone number / SIM sends automated call replies
              </Text>

              <RadioButton.Group
                onValueChange={(val) => setSelectedSim(val)}
                value={selectedSim}
              >
                {simCards.map((s) => {
                  const isCur =
                    selectedSim === s.subscriptionId.toString() ||
                    selectedSim === s.simSlotIndex.toString() ||
                    (selectedSim === "-1" && s.simSlotIndex === 0);
                  const op = getSimOperator(s);
                  const phone = getSimPhoneNumber(s);

                  return (
                    <View
                      key={s.subscriptionId}
                      style={[styles.radioRow, isCur && styles.radioRowActive]}
                    >
                      <RadioButton
                        value={s.subscriptionId.toString()}
                        color="#2563EB"
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text
                            style={[
                              styles.radioText,
                              isCur && { fontWeight: "800", color: "#1E3A8A" },
                            ]}
                          >
                            SIM {s.simSlotIndex + 1}
                          </Text>
                          <View
                            style={{
                              backgroundColor: isCur ? "#DBEAFE" : "#E2E8F0",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                color: isCur ? "#1D4ED8" : "#475569",
                              }}
                            >
                              OPERATOR: {op.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "600", marginTop: 2 }}>
                          {phone ? `📞 ${phone}` : "No number saved (Set on Dashboard)"}
                        </Text>

                        <Text style={{ fontSize: 11, color: isCur ? "#16A34A" : "#64748B", marginTop: 2 }}>
                          {isCur ? "● Active sender for all call responses" : "Tap radio to select this operator"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </RadioButton.Group>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            icon={() => <Save color="white" size={18} />}
            onPress={handleSave}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveBottomBtn}
            contentStyle={{ paddingVertical: 6 }}
          >
            Save All Automation Rules
          </Button>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  saveHeaderBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  successBanner: {
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  successText: {
    color: "#166534",
    fontWeight: "700",
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ruleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  ruleSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  presetScroll: {
    marginBottom: 8,
  },
  presetChip: {
    marginRight: 8,
    backgroundColor: "#F1F5F9",
  },
  presetChipText: {
    fontSize: 11,
    color: "#334155",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  textInput: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  previewBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  previewHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  smsBubble: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  smsBubbleText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  numberInput: {
    width: 90,
    backgroundColor: "#FFFFFF",
  },
  hoursRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  radioRowActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  radioText: {
    fontSize: 13,
    color: "#1E293B",
    marginLeft: 4,
  },
  divider: {
    marginVertical: 12,
  },
  saveBottomBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    marginTop: 8,
  },
});

