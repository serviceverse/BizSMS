import React, { useContext, useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Appbar,
  TextInput,
  Chip,
  ProgressBar,
  Divider,
  Searchbar,
  Badge,
} from "react-native-paper";
import {
  Sparkles,
  Send,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Trash2,
  Play,
  X,
  MessageSquare,
  Plus,
  RefreshCw,
  Phone,
  PhoneCall,
  UserPlus,
  CheckCircle2,
  Check,
  Star,
  RotateCcw,
} from "lucide-react-native";
import { AppContext, Campaign } from "../context/AppContext";
import { PRESET_TEMPLATES } from "../services/templatePresets";
import { calculateSmsParts } from "../services/smsService";
import RichTextEditor from "../components/RichTextEditor";
import { colors } from "../theme/theme";

export default function CampaignsScreen() {
  const {
    campaigns,
    createCampaign,
    cancelCampaign,
    executeCampaignNow,
    contacts,
    refreshContacts,
    toggleFavoriteContact,
    updateFavoritesBulk,
    logs,
    automations,
    replaceTags,
    simCards,
    getSelectedSim,
    getSimDisplayLabel,
    getSimOperator,
    getSimPhoneNumber,
    setSelectedSimId,
  } = useContext(AppContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<
    "festival" | "offer" | "reminder" | "general"
  >("festival");
  const [message, setMessage] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Audience Selection Modes: "contacts" | "favorites" | "manual" | "recent"
  const [audienceTab, setAudienceTab] = useState<"contacts" | "favorites" | "manual" | "recent">("contacts");
  const [manualInput, setManualInput] = useState("");
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(40);

  useEffect(() => {
    if (contacts.length === 0) {
      refreshContacts();
    }
  }, []);

  // Reset pagination limit on search or tab change
  useEffect(() => {
    setDisplayLimit(40);
  }, [searchQuery, audienceTab]);

  const selectedSim = getSelectedSim();

  // Fast O(1) set lookup for selected contact numbers
  const selectedContactsSet = useMemo(
    () => new Set(selectedContacts),
    [selectedContacts]
  );

  // Fast O(1) contact details lookup by cleaned phone number
  const contactsMap = useMemo(() => {
    const map = new Map<string, (typeof contacts)[0]>();
    for (const c of contacts) {
      const clean = c.number.replace(/[^0-9+]/g, "").trim();
      if (clean) map.set(clean, c);
    }
    return map;
  }, [contacts]);

  // Favorite contacts memoized
  const favoriteContacts = useMemo(
    () => contacts.filter((c) => c.favorite && !c.blocked && c.number),
    [contacts]
  );

  // Filter contacts in modal based on search and tab
  const filteredContacts = useMemo(() => {
    const activeContactsList = audienceTab === "favorites" ? favoriteContacts : contacts;
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return activeContactsList.filter((c) => !c.blocked && c.number);
    }
    return activeContactsList.filter(
      (c) =>
        !c.blocked &&
        c.number &&
        (c.name.toLowerCase().includes(q) || c.number.includes(q))
    );
  }, [audienceTab, favoriteContacts, contacts, searchQuery]);

  // Sliced contacts for ultra-smooth 60fps rendering without ANR freeze
  const visibleContacts = useMemo(() => {
    return filteredContacts.slice(0, displayLimit);
  }, [filteredContacts, displayLimit]);

  const toggleContact = (number: string) => {
    const clean = number.replace(/[^0-9+]/g, "").trim();
    if (!clean) return;
    setSelectedContacts((prev) =>
      prev.includes(clean)
        ? prev.filter((n) => n !== clean)
        : [...prev, clean]
    );
  };

  const removeContact = (number: string) => {
    setSelectedContacts((prev) => prev.filter((n) => n !== number));
  };

  const handleResetForm = () => {
    Alert.alert(
      "Reset Broadcast Form?",
      "This will clear the message body, title, and selected contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset All",
          style: "destructive",
          onPress: () => {
            setMessage("");
            setSelectedContacts([]);
            setTitle("");
            setManualInput("");
            setSearchQuery("");
          },
        },
      ]
    );
  };

  const handleResetMessageOnly = () => {
    setMessage("");
  };

  const selectAllFavorites = () => {
    const favNums = favoriteContacts
      .map((c) => c.number.replace(/[^0-9+]/g, "").trim())
      .filter((n) => n.length >= 7);
    if (favNums.length === 0) {
      Alert.alert(
        "No Favorites Found",
        "You haven't marked any contacts as favorites yet. Select contacts and tap 'Favorite All' or tap the ⭐ star icon next to any contact."
      );
      return;
    }
    setSelectedContacts(Array.from(new Set([...selectedContacts, ...favNums])));
    Alert.alert("Favorites Selected", `Added ${favNums.length} favorite contact(s) to audience.`);
  };

  const handleBulkUpdateFavorites = async (isFavorite: boolean) => {
    if (selectedContacts.length === 0) {
      Alert.alert("No Contacts Selected", "Please select at least 1 contact first.");
      return;
    }
    await updateFavoritesBulk(selectedContacts, isFavorite);
    Alert.alert(
      isFavorite ? "⭐ Favorites Updated" : "Removed from Favorites",
      isFavorite
        ? `Successfully saved all ${selectedContacts.length} selected numbers as Favorites!`
        : `Removed ${selectedContacts.length} numbers from Favorites.`
    );
  };

  const selectAllFiltered = () => {
    const numbers = filteredContacts
      .map((c) => c.number.replace(/[^0-9+]/g, "").trim())
      .filter((n) => n.length >= 7);
    if (numbers.length === 0) {
      Alert.alert("No Contacts Found", "No contacts match your current search query.");
      return;
    }
    setSelectedContacts(Array.from(new Set([...selectedContacts, ...numbers])));
  };

  const selectTopN = (count: number) => {
    const numbers = filteredContacts
      .slice(0, count)
      .map((c) => c.number.replace(/[^0-9+]/g, "").trim())
      .filter((n) => n.length >= 7);
    if (numbers.length === 0) {
      Alert.alert("No Contacts Available", "No phonebook contacts found to select.");
      return;
    }
    setSelectedContacts(Array.from(new Set([...selectedContacts, ...numbers])));
  };

  const clearSelection = () => {
    setSelectedContacts([]);
  };

  const handleSyncPhonebook = async () => {
    setIsSyncingContacts(true);
    await refreshContacts();
    setIsSyncingContacts(false);
  };

  const handleAddManualNumbers = () => {
    if (!manualInput.trim()) {
      Alert.alert("Input Required", "Please enter or paste phone numbers.");
      return;
    }
    const rawItems = manualInput.split(/[\n,; ]+/);
    const validNumbers: string[] = [];
    for (const item of rawItems) {
      const clean = item.replace(/[^0-9+]/g, "").trim();
      if (clean.length >= 7) {
        validNumbers.push(clean);
      }
    }
    if (validNumbers.length === 0) {
      Alert.alert(
        "Invalid Numbers",
        "Please enter valid phone numbers with at least 7-10 digits."
      );
      return;
    }
    const merged = Array.from(new Set([...selectedContacts, ...validNumbers]));
    setSelectedContacts(merged);
    setManualInput("");
    Alert.alert("Numbers Added", `Added ${validNumbers.length} recipient(s) to your audience.`);
  };

  const handleAddSelfNumber = () => {
    const simPhone = getSimPhoneNumber(selectedSim);
    if (!simPhone) {
      Alert.alert("No SIM Number", "Please set your phone number on Dashboard first.");
      return;
    }
    const clean = simPhone.replace(/[^0-9+]/g, "").trim();
    if (!selectedContacts.includes(clean)) {
      setSelectedContacts((prev) => [...prev, clean]);
      Alert.alert("Test Number Added", `Added active SIM (${simPhone}) to audience.`);
    }
  };

  // Recent callers from message/call logs
  const recentCallerNumbers = Array.from(
    new Set(
      logs
        .filter((l) => l.number && l.number.replace(/[^0-9]/g, "").length >= 7)
        .map((l) => l.number.replace(/[^0-9+]/g, "").trim())
    )
  );

  const handleAddRecentCallers = () => {
    if (recentCallerNumbers.length === 0) {
      Alert.alert("No Recent Callers", "No call history available yet to import.");
      return;
    }
    const merged = Array.from(new Set([...selectedContacts, ...recentCallerNumbers]));
    setSelectedContacts(merged);
    Alert.alert("Recent Callers Added", `Added ${recentCallerNumbers.length} caller(s) to your broadcast.`);
  };

  const handleApplyPreset = (text: string, titleStr: string) => {
    setMessage(text);
    if (!title) setTitle(titleStr);
  };

  const handleCreateAndSend = async (instantSend: boolean) => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please give your broadcast a name.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Missing Message", "Please write or select a message template.");
      return;
    }
    if (selectedContacts.length === 0) {
      Alert.alert("No Contacts Selected", "Please select at least 1 contact.");
      return;
    }

    const newCamp = {
      title: title.trim(),
      category,
      message: message.trim(),
      targetNumbers: selectedContacts,
      scheduledAt: new Date().toISOString(),
      totalCount: selectedContacts.length,
    };

    setModalVisible(false);

    if (instantSend) {
      setIsSending(true);
      try {
        const created = await createCampaign(newCamp);
        await executeCampaignNow(created.id, created);
      } catch (err: any) {
        console.error("Instant broadcast error:", err);
      } finally {
        setIsSending(false);
      }
    } else {
      await createCampaign(newCamp);
    }

    // Reset form
    setTitle("");
    setMessage("");
    setSelectedContacts([]);
    setSearchQuery("");
  };

  const TAGS = [
    "{name}",
    "{business_name}",
    "{whatsapp}",
    "{maps_link}",
    "{catalog_link}",
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content
          title="Campaigns & Offers"
          subtitle="Festival greetings & customer broadcasts"
          titleStyle={styles.headerTitle}
        />
        <Button
          mode="contained"
          icon={() => <Sparkles color="white" size={16} />}
          onPress={() => setModalVisible(true)}
          style={styles.newCampaignBtn}
        >
          New Broadcast
        </Button>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sending Route Banner */}
        <Card style={styles.quotaBanner}>
          <Card.Content style={styles.quotaContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quotaTitle}>SENDING FROM ACTIVE SIM:</Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#1E3A8A", marginTop: 2 }}>
                {selectedSim ? getSimDisplayLabel(selectedSim) : "Default SIM"}
              </Text>
              <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "600", marginTop: 2 }}>
                Route Active & Ready for Broadcasts
              </Text>
            </View>
            <Chip style={styles.quotaChip} textStyle={{ color: "#2563EB", fontWeight: "700" }}>
              SIM Connected
            </Chip>
          </Card.Content>
        </Card>

        {/* Campaigns List */}
        <Text style={styles.sectionHeader}>📋 Broadcast Campaigns</Text>

        {campaigns.length > 0 ? (
          campaigns.map((camp) => {
            const isCompleted = camp.status === "completed";
            const isRunning = camp.status === "running";
            const progress =
              camp.totalCount > 0 ? camp.sentCount / camp.totalCount : 0;

            return (
              <Card key={camp.id} style={styles.campaignCard}>
                <Card.Content>
                  <View style={styles.campaignHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.campTitle}>{camp.title}</Text>
                        <Badge
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isCompleted
                                ? "#10B981"
                                : isRunning
                                ? "#F59E0B"
                                : "#64748B",
                            },
                          ]}
                        >
                          {camp.status.toUpperCase()}
                        </Badge>
                      </View>
                      <Text style={styles.campDate}>
                        Created: {new Date(camp.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    {camp.status === "scheduled" && (
                      <TouchableOpacity
                        style={styles.playBtn}
                        onPress={() => executeCampaignNow(camp.id)}
                      >
                        <Play color="white" size={16} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.campMsgPreview} numberOfLines={2}>
                    {camp.message}
                  </Text>

                  <View style={{ marginVertical: 8 }}>
                    <View style={styles.campProgressRow}>
                      <Text style={styles.campProgressText}>
                        Delivered: {camp.sentCount} / {camp.totalCount} recipients
                      </Text>
                      <Text style={styles.campPercentText}>
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                    <ProgressBar
                      progress={progress}
                      color="#2563EB"
                      style={styles.progressBar}
                    />
                  </View>

                  <View style={styles.campFooter}>
                    <Text style={styles.campCategoryText}>
                      🏷️ {camp.category.toUpperCase()}
                    </Text>
                    {camp.status === "scheduled" && (
                      <TouchableOpacity onPress={() => cancelCampaign(camp.id)}>
                        <Text style={{ color: "#EF4444", fontSize: 12 }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Sparkles color="#94A3B8" size={40} />
              <Text style={styles.emptyTitle}>No Campaigns Yet</Text>
              <Text style={styles.emptyDesc}>
                Create festival greetings, sweet shop offers, or clinic follow-up
                broadcasts using your SIM messaging route.
              </Text>
              <Button
                mode="contained"
                onPress={() => setModalVisible(true)}
                style={{ marginTop: 14, backgroundColor: "#2563EB" }}
              >
                Create First Broadcast
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* New Campaign Creation Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Appbar.Header style={styles.header}>
            <Appbar.Action
              icon={() => <X color="#0F172A" size={24} />}
              onPress={() => setModalVisible(false)}
            />
            <Appbar.Content title="Create New Broadcast" />
            <Button
              mode="text"
              textColor="#EF4444"
              icon={() => <RotateCcw color="#EF4444" size={15} />}
              onPress={handleResetForm}
              compact
            >
              Reset
            </Button>
          </Appbar.Header>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Title */}
            <TextInput
              mode="outlined"
              label="Broadcast Title (e.g. Diwali Mega Offer)"
              value={title}
              onChangeText={setTitle}
              textColor={colors.textPrimary}
              placeholderTextColor={colors.textPlaceholder}
              outlineColor={colors.borderInput}
              activeOutlineColor={colors.primary}
              style={styles.modalInput}
            />

            {/* Sender SIM Selection */}
            <Text style={styles.modalLabel}>📶 Sender SIM & Number:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {simCards.map((sim) => {
                const isSelected =
                  automations.selectedSimId === sim.subscriptionId ||
                  (automations.selectedSimId < 0 && sim === selectedSim);
                return (
                  <Chip
                    key={sim.subscriptionId}
                    selected={isSelected}
                    onPress={() => setSelectedSimId(sim.subscriptionId)}
                    style={[
                      styles.modalChip,
                      isSelected && {
                        backgroundColor: "#DBEAFE",
                        borderColor: "#2563EB",
                        borderWidth: 1,
                      },
                    ]}
                    textStyle={{ fontWeight: isSelected ? "700" : "500", color: isSelected ? "#2563EB" : "#334155" }}
                  >
                    {getSimDisplayLabel(sim)}
                  </Chip>
                );
              })}
            </ScrollView>

            {/* Quick Industry Presets */}
            <Text style={styles.modalLabel}>✨ Pick Curated Template:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {PRESET_TEMPLATES.filter(
                (p) =>
                  p.category === "festival" ||
                  p.category === "sweets" ||
                  p.category === "clinic" ||
                  p.category === "offer"
              ).map((p) => (
                <Chip
                  key={p.id}
                  style={styles.modalChip}
                  onPress={() => handleApplyPreset(p.message, p.title)}
                >
                  {p.title}
                </Chip>
              ))}
            </ScrollView>

            {/* Rich Text Message Body with Bold / Italic / Styling Tools */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={styles.modalLabel}>✍️ Custom Styled Message Body:</Text>
              {message.length > 0 && (
                <TouchableOpacity onPress={handleResetMessageOnly} style={styles.clearBtn}>
                  <RotateCcw color="#EF4444" size={12} />
                  <Text style={styles.clearBtnText}>Clear Text</Text>
                </TouchableOpacity>
              )}
            </View>
            <RichTextEditor
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message... Select text & tap Bold or Italic to style!"
              tags={TAGS}
              minHeight={140}
            />

            {/* Recipient Phone Live Preview */}
            {message ? (
              <View style={styles.previewBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <MessageSquare color="#2563EB" size={14} />
                  <Text style={styles.previewLabel}>Recipient Phone Live Preview:</Text>
                </View>
                <View style={styles.previewBubble}>
                  <Text style={styles.previewText}>
                    {replaceTags(message, "Rahul Sharma")}
                  </Text>
                </View>
              </View>
            ) : null}

            <Divider style={{ marginVertical: 14 }} />

            {/* Target Contacts Selection Section */}
            <View style={styles.audienceSectionHeader}>
              <View>
                <Text style={styles.modalLabel}>👥 Target Audience Selection:</Text>
                <Text style={styles.audienceSubtitle}>
                  {selectedContacts.length} recipient{selectedContacts.length === 1 ? "" : "s"} selected
                </Text>
              </View>
              {selectedContacts.length > 0 && (
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => handleBulkUpdateFavorites(true)}
                    style={styles.favBulkBtn}
                  >
                    <Star color="#B45309" fill="#F59E0B" size={13} />
                    <Text style={styles.favBulkBtnText}>Favorite All ({selectedContacts.length})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={clearSelection} style={styles.clearBtn}>
                    <Trash2 color="#EF4444" size={13} />
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Selected Audience Chips Carousel */}
            {selectedContacts.length > 0 && (
              <View style={styles.selectedPillsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedContacts.slice(0, 30).map((num) => {
                    const match = contactsMap.get(num);
                    const isFav = match?.favorite;
                    const label = match ? `${isFav ? "⭐ " : ""}${match.name} (${num.slice(-4)})` : num;
                    return (
                      <View key={num} style={[styles.selectedPill, isFav && { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                        <Text style={[styles.selectedPillText, isFav && { color: "#92400E" }]}>{label}</Text>
                        <TouchableOpacity
                          onPress={() => removeContact(num)}
                          style={styles.removePillBtn}
                        >
                          <X color={isFav ? "#92400E" : "#1E40AF"} size={13} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {selectedContacts.length > 30 && (
                    <View style={[styles.selectedPill, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                      <Text style={[styles.selectedPillText, { color: "#1D4ED8", fontWeight: "700" }]}>
                        +{selectedContacts.length - 30} more selected
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Audience Mode Switcher Tabs */}
            <View style={styles.audienceTabsRow}>
              <TouchableOpacity
                style={[styles.audTabBtn, audienceTab === "contacts" && styles.audTabBtnActive]}
                onPress={() => setAudienceTab("contacts")}
              >
                <Users color={audienceTab === "contacts" ? "#2563EB" : "#64748B"} size={14} />
                <Text style={[styles.audTabBtnText, audienceTab === "contacts" && styles.audTabBtnTextActive]}>
                  Contacts ({contacts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.audTabBtn, audienceTab === "favorites" && styles.audTabBtnActive]}
                onPress={() => setAudienceTab("favorites")}
              >
                <Star
                  color={audienceTab === "favorites" ? "#D97706" : "#64748B"}
                  fill={audienceTab === "favorites" ? "#F59E0B" : "transparent"}
                  size={14}
                />
                <Text
                  style={[
                    styles.audTabBtnText,
                    audienceTab === "favorites" && { color: "#B45309", fontWeight: "700" },
                  ]}
                >
                  Favorites ({favoriteContacts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.audTabBtn, audienceTab === "manual" && styles.audTabBtnActive]}
                onPress={() => setAudienceTab("manual")}
              >
                <UserPlus color={audienceTab === "manual" ? "#2563EB" : "#64748B"} size={14} />
                <Text style={[styles.audTabBtnText, audienceTab === "manual" && styles.audTabBtnTextActive]}>
                  Type / Paste
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.audTabBtn, audienceTab === "recent" && styles.audTabBtnActive]}
                onPress={() => setAudienceTab("recent")}
              >
                <PhoneCall color={audienceTab === "recent" ? "#2563EB" : "#64748B"} size={14} />
                <Text style={[styles.audTabBtnText, audienceTab === "recent" && styles.audTabBtnTextActive]}>
                  Recent ({recentCallerNumbers.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: PHONEBOOK CONTACTS & FAVORITES */}
            {(audienceTab === "contacts" || audienceTab === "favorites") && (
              <View style={styles.tabContentCard}>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <Searchbar
                    placeholder={
                      audienceTab === "favorites"
                        ? "Search favorites..."
                        : "Search contact name or number..."
                    }
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={[styles.searchbar, { flex: 1, marginBottom: 0 }]}
                    inputStyle={{ fontSize: 13, color: colors.textPrimary }}
                    iconColor={colors.primary}
                    placeholderTextColor={colors.textPlaceholder}
                  />
                  <TouchableOpacity
                    style={styles.syncContactsBtn}
                    onPress={handleSyncPhonebook}
                  >
                    <RefreshCw color="#2563EB" size={16} />
                    <Text style={styles.syncContactsBtnText}>
                      {isSyncingContacts ? "Syncing..." : "Sync"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Selection Shortcuts */}
                <View style={styles.quickSelectActionsRow}>
                  <TouchableOpacity style={styles.quickActionChip} onPress={selectAllFiltered}>
                    <CheckCircle2 color="#2563EB" size={13} />
                    <Text style={styles.quickActionChipText}>
                      Select All ({filteredContacts.length})
                    </Text>
                  </TouchableOpacity>

                  {favoriteContacts.length > 0 && audienceTab !== "favorites" && (
                    <TouchableOpacity
                      style={[
                        styles.quickActionChip,
                        { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
                      ]}
                      onPress={selectAllFavorites}
                    >
                      <Star color="#D97706" fill="#F59E0B" size={13} />
                      <Text
                        style={[
                          styles.quickActionChipText,
                          { color: "#92400E", fontWeight: "700" },
                        ]}
                      >
                        All Favorites ({favoriteContacts.length})
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.quickActionChip} onPress={() => selectTopN(20)}>
                    <Text style={styles.quickActionChipText}>Top 20</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickActionChip} onPress={() => selectTopN(50)}>
                    <Text style={styles.quickActionChipText}>Top 50</Text>
                  </TouchableOpacity>
                </View>

                {/* Empty State when no contacts */}
                {audienceTab === "favorites" && favoriteContacts.length === 0 ? (
                  <View style={styles.emptyContactsNotice}>
                    <Star color="#D97706" size={32} />
                    <Text style={styles.emptyNoticeTitle}>No Favorite Contacts Yet</Text>
                    <Text style={styles.emptyNoticeSub}>
                      Switch to "Contacts" tab and tap the ⭐ star icon next to contacts, or select contacts and tap "Favorite All".
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setAudienceTab("contacts")}
                      textColor={colors.primary}
                      style={{ marginTop: 8, borderColor: colors.primary }}
                      compact
                    >
                      Browse All Contacts
                    </Button>
                  </View>
                ) : contacts.length === 0 ? (
                  <View style={styles.emptyContactsNotice}>
                    <Users color="#94A3B8" size={32} />
                    <Text style={styles.emptyNoticeTitle}>No Phonebook Contacts Found</Text>
                    <Text style={styles.emptyNoticeSub}>
                      Tap below to sync contacts from your device, or use the "Type / Paste" tab above to add numbers directly.
                    </Text>
                    <Button
                      mode="contained"
                      icon={() => <RefreshCw color="white" size={14} />}
                      onPress={handleSyncPhonebook}
                      style={{ marginTop: 8, backgroundColor: "#2563EB" }}
                      loading={isSyncingContacts}
                    >
                      Sync Contacts Now
                    </Button>
                  </View>
                ) : filteredContacts.length === 0 ? (
                  <View style={styles.noMatchNotice}>
                    <Text style={{ color: "#64748B", fontSize: 12 }}>
                      No contacts matching "{searchQuery}".
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={styles.contactsScrollList} nestedScrollEnabled>
                    {visibleContacts.map((c) => {
                      const clean = c.number.replace(/[^0-9+]/g, "").trim();
                      const isSelected = selectedContactsSet.has(clean);
                      return (
                        <View
                          key={c.id}
                          style={[
                            styles.contactListItem,
                            isSelected && styles.contactListItemSelected,
                          ]}
                        >
                          {/* Main tap area to select contact */}
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                            onPress={() => toggleContact(clean)}
                          >
                            <View
                              style={[
                                styles.contactAvatar,
                                isSelected && { backgroundColor: "#2563EB" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.contactAvatarText,
                                  isSelected && { color: "#FFFFFF" },
                                ]}
                              >
                                {c.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 10 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text
                                  style={[
                                    styles.contactListName,
                                    isSelected && { color: "#1D4ED8", fontWeight: "700" },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {c.name}
                                </Text>
                                {c.favorite && (
                                  <Star color="#F59E0B" fill="#F59E0B" size={12} />
                                )}
                              </View>
                              <Text style={styles.contactListNumber}>{c.number}</Text>
                            </View>
                          </TouchableOpacity>

                          {/* Star toggle button */}
                          <TouchableOpacity
                            style={styles.starToggleBtn}
                            onPress={() => toggleFavoriteContact(c.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Star
                              color={c.favorite ? "#F59E0B" : "#CBD5E1"}
                              fill={c.favorite ? "#F59E0B" : "transparent"}
                              size={18}
                            />
                          </TouchableOpacity>

                          {/* Checkbox indicator */}
                          <TouchableOpacity
                            style={[
                              styles.checkboxPill,
                              isSelected && styles.checkboxPillActive,
                            ]}
                            onPress={() => toggleContact(clean)}
                          >
                            {isSelected ? (
                              <Check color="#FFFFFF" size={14} />
                            ) : (
                              <Plus color="#94A3B8" size={14} />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {filteredContacts.length > displayLimit && (
                      <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={() => setDisplayLimit((prev) => prev + 50)}
                      >
                        <Text style={styles.loadMoreBtnText}>
                          Showing {visibleContacts.length} of {filteredContacts.length} • Tap for more (+50)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {/* TAB 2: MANUAL NUMBER ENTRY & PASTE */}
            {audienceTab === "manual" && (
              <View style={styles.tabContentCard}>
                <Text style={styles.manualInputNotice}>
                  Type or paste phone numbers (separated by comma, space, or new lines):
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g. 9876543210, 9811223344&#10;9988776655"
                  value={manualInput}
                  onChangeText={setManualInput}
                  multiline
                  numberOfLines={3}
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textPlaceholder}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.manualTextInput}
                />
                <View style={styles.manualActionsRow}>
                  <Button
                    mode="contained"
                    icon={() => <Plus color="white" size={14} />}
                    onPress={handleAddManualNumbers}
                    buttonColor={colors.primary}
                    textColor="#FFFFFF"
                    compact
                  >
                    Add Numbers
                  </Button>
                  <Button
                    mode="outlined"
                    icon={() => <Phone color={colors.primary} size={14} />}
                    onPress={handleAddSelfNumber}
                    textColor={colors.primary}
                    style={{ borderColor: colors.primaryBorder }}
                    compact
                  >
                    + Add My SIM (Test)
                  </Button>
                </View>
              </View>
            )}

            {/* TAB 3: RECENT CALLERS */}
            {audienceTab === "recent" && (
              <View style={styles.tabContentCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155" }}>
                    Recent Call Leads ({recentCallerNumbers.length}):
                  </Text>
                  {recentCallerNumbers.length > 0 && (
                    <TouchableOpacity onPress={handleAddRecentCallers}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563EB" }}>
                        + Add All Recent
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {recentCallerNumbers.length === 0 ? (
                  <View style={styles.noMatchNotice}>
                    <Text style={{ color: "#64748B", fontSize: 12 }}>
                      No incoming or missed calls recorded in logs yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={styles.contactsScrollList} nestedScrollEnabled>
                    {recentCallerNumbers.slice(0, 30).map((num) => {
                      const isSelected = selectedContactsSet.has(num);
                      const match = contactsMap.get(num);
                      return (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.contactListItem,
                            isSelected && styles.contactListItemSelected,
                          ]}
                          onPress={() => toggleContact(num)}
                        >
                          <View style={styles.contactAvatar}>
                            <PhoneCall color="#2563EB" size={14} />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <Text style={styles.contactListName}>
                              {match ? match.name : "Recent Caller"}
                            </Text>
                            <Text style={styles.contactListNumber}>{num}</Text>
                          </View>
                          <View
                            style={[
                              styles.checkboxPill,
                              isSelected && styles.checkboxPillActive,
                            ]}
                          >
                            {isSelected ? (
                              <Check color="#FFFFFF" size={14} />
                            ) : (
                              <Plus color="#94A3B8" size={14} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Audience & Message Estimation */}
            {(() => {
              const sample = replaceTags(message, "Customer Name");
              const info = calculateSmsParts(sample);
              return (
                <Card style={styles.impactCard}>
                  <Card.Content>
                    <Text style={styles.impactTitle}>
                      Target Audience: {selectedContacts.length} recipients ({info.parts || 1} {info.parts === 1 ? "SMS segment" : "SMS segments"} per contact)
                    </Text>
                    <Text style={styles.impactDesc}>
                      {info.isUnicode ? "Unicode format (Hindi/regional/emojis)." : "Standard GSM format."} Safe throttled delivery with 1-sec intervals to protect your SIM. Verify your daily balance directly in your operator app (MyJio/Airtel).
                    </Text>
                  </Card.Content>
                </Card>
              );
            })()}

            <View style={styles.actionBtnRow}>
              <Button
                mode="contained"
                icon={() => <Send color="white" size={16} />}
                onPress={() => handleCreateAndSend(true)}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                style={[styles.modalBtn, { flex: 2 }]}
              >
                Send Now ({selectedContacts.length})
              </Button>
              <Button
                mode="outlined"
                icon={() => <RotateCcw color={colors.danger} size={16} />}
                onPress={handleResetForm}
                textColor={colors.danger}
                style={[styles.modalBtn, { borderColor: colors.dangerBorder, flex: 1, marginLeft: 8 }]}
              >
                Reset All
              </Button>
            </View>
          </ScrollView>
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
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  newCampaignBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quotaBanner: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  quotaContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quotaTitle: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  quotaNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E3A8A",
    marginTop: 2,
  },
  quotaChip: {
    backgroundColor: "#DBEAFE",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  campaignCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 2,
    marginBottom: 12,
  },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  campTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 8,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "700",
  },
  campDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  campMsgPreview: {
    fontSize: 13,
    color: "#475569",
    marginTop: 8,
    lineHeight: 18,
  },
  campProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  campProgressText: {
    fontSize: 11,
    color: "#64748B",
  },
  campPercentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  campFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  campCategoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  modalChip: {
    marginRight: 8,
    backgroundColor: "#EFF6FF",
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
  previewBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  previewBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 19,
  },
  searchbar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 10,
    height: 44,
  },
  contactChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  contactChip: {
    backgroundColor: "#FFFFFF",
  },
  impactCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  impactDesc: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  actionBtnRow: {
    marginTop: 10,
  },
  modalBtn: {
    borderRadius: 10,
    paddingVertical: 4,
  },
  audienceSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  audienceSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "700",
  },
  favBulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  favBulkBtnText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
  },
  starToggleBtn: {
    padding: 6,
    marginRight: 4,
  },
  selectedPillsContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  removePillBtn: {
    marginLeft: 4,
    padding: 2,
  },
  audienceTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  audTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  audTabBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
  },
  audTabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  audTabBtnTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  tabContentCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  syncContactsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    justifyContent: "center",
  },
  syncContactsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  quickSelectActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  quickActionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  emptyContactsNotice: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  emptyNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
  },
  emptyNoticeSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  noMatchNotice: {
    paddingVertical: 12,
    alignItems: "center",
  },
  contactsScrollList: {
    maxHeight: 220,
  },
  loadMoreBtn: {
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadMoreBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  contactListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactListItemSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  contactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  contactListName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  contactListNumber: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  checkboxPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxPillActive: {
    backgroundColor: "#2563EB",
  },
  manualInputNotice: {
    fontSize: 11,
    color: "#475569",
    marginBottom: 6,
  },
  manualTextInput: {
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    marginBottom: 8,
  },
  manualActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

