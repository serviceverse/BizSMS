import React, { useContext, useState, useEffect } from "react";
import { View, ScrollView, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { AppContext } from "../context/AppContext";
import { Text, Appbar, Chip, Searchbar, Button } from "react-native-paper";
import { Ban, Check, RefreshCw, Users, ShieldAlert, Star } from "lucide-react-native";
import { colors } from "../theme/theme";

export default function ContactsScreen() {
  const {
    contacts,
    blockContact,
    unblockContact,
    refreshContacts,
    toggleFavoriteContact,
  } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "active" | "blocked">("all");
  const [filteredContacts, setFilteredContacts] = useState(contacts);

  useEffect(() => {
    if (contacts.length === 0) {
      refreshContacts();
    }
  }, []);

  useEffect(() => {
    let list = contacts;

    if (activeTab === "favorites") {
      list = list.filter((c) => c.favorite && !c.blocked);
    } else if (activeTab === "active") {
      list = list.filter((c) => !c.blocked);
    } else if (activeTab === "blocked") {
      list = list.filter((c) => c.blocked);
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.number.toLowerCase().includes(lower)
      );
    }

    setFilteredContacts(list);
  }, [searchQuery, activeTab, contacts]);

  const blockedCount = contacts.filter((c) => c.blocked).length;
  const favoriteCount = contacts.filter((c) => c.favorite && !c.blocked).length;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content
          title="Contacts & Exclusion"
          subtitle={`${contacts.length} synced contacts • ${favoriteCount} favorites`}
          titleStyle={styles.headerTitle}
        />
        <TouchableOpacity style={styles.headerBtn} onPress={refreshContacts}>
          <RefreshCw color="#2563EB" size={20} />
        </TouchableOpacity>
      </Appbar.Header>

      <View style={styles.content}>
        {/* Search */}
        <Searchbar
          placeholder="Search name or phone number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={{ fontSize: 13, color: colors.textPrimary }}
          iconColor={colors.primary}
          placeholderTextColor={colors.textPlaceholder}
        />

        {/* Filter Pills */}
        <View style={{ marginBottom: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <Chip
              selected={activeTab === "all"}
              onPress={() => setActiveTab("all")}
              style={[styles.filterChip, activeTab === "all" && styles.filterChipActive]}
              textStyle={activeTab === "all" ? styles.filterTextActive : styles.filterText}
            >
              All ({contacts.length})
            </Chip>

            <Chip
              selected={activeTab === "favorites"}
              onPress={() => setActiveTab("favorites")}
              style={[
                styles.filterChip,
                activeTab === "favorites" && {
                  backgroundColor: "#FEF3C7",
                  borderColor: "#FDE68A",
                  borderWidth: 1,
                },
              ]}
              textStyle={{
                color: activeTab === "favorites" ? "#B45309" : "#64748B",
                fontWeight: activeTab === "favorites" ? "700" : "500",
              }}
            >
              ⭐ Favorites ({favoriteCount})
            </Chip>

            <Chip
              selected={activeTab === "active"}
              onPress={() => setActiveTab("active")}
              style={[
                styles.filterChip,
                activeTab === "active" && styles.filterChipActive,
              ]}
              textStyle={
                activeTab === "active" ? styles.filterTextActive : styles.filterText
              }
            >
              Active ({contacts.length - blockedCount})
            </Chip>

            <Chip
              selected={activeTab === "blocked"}
              onPress={() => setActiveTab("blocked")}
              style={[
                styles.filterChip,
                activeTab === "blocked" && { backgroundColor: "#FEE2E2" },
              ]}
              textStyle={{
                color: activeTab === "blocked" ? "#DC2626" : "#64748B",
                fontWeight: "700",
              }}
            >
              Blocked / VIP ({blockedCount})
            </Chip>
          </ScrollView>
        </View>

        {/* Tip Banner */}
        <View style={styles.tipBanner}>
          <ShieldAlert color="#64748B" size={16} />
          <Text style={styles.tipText}>
            Contacts marked as "Blocked / VIP" will never receive automated SMS. Tap ⭐ to add to favorites.
          </Text>
        </View>

        {/* Contacts FlatList */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={10}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {item.name ? item.name[0].toUpperCase() : "#"}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                  {item.favorite && (
                    <Star
                      color="#F59E0B"
                      fill="#F59E0B"
                      size={14}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                <Text style={styles.contactNumber}>{item.number}</Text>

                <View style={{ flexDirection: "row", marginTop: 4 }}>
                  <Chip
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: item.blocked
                          ? "#FEE2E2"
                          : item.favorite
                          ? "#FEF3C7"
                          : "#DCFCE7",
                      },
                    ]}
                    textStyle={{
                      color: item.blocked
                        ? "#DC2626"
                        : item.favorite
                        ? "#B45309"
                        : "#16A34A",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {item.blocked
                      ? "Excluded / VIP"
                      : item.favorite
                      ? "⭐ Favorite Customer"
                      : "Auto-Reply Enabled"}
                  </Chip>
                </View>
              </View>

              {/* Action Buttons: Star (Favorite) + Block / Unblock */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: item.favorite ? "#FEF3C7" : "#F1F5F9" },
                  ]}
                  onPress={() => toggleFavoriteContact(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Star
                    color={item.favorite ? "#F59E0B" : "#94A3B8"}
                    fill={item.favorite ? "#F59E0B" : "transparent"}
                    size={18}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: item.blocked ? "#DCFCE7" : "#FEE2E2" },
                  ]}
                  onPress={() =>
                    item.blocked ? unblockContact(item.id) : blockContact(item.id)
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {item.blocked ? (
                    <Check color="#16A34A" size={18} />
                  ) : (
                    <Ban color="#DC2626" size={18} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Users color="#94A3B8" size={40} />
              <Text style={styles.emptyText}>No contacts found</Text>
              <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 4, marginHorizontal: 20 }}>
                Tap below to sync contacts from your phonebook or check contact permissions.
              </Text>
              <Button
                mode="contained"
                icon={() => <RefreshCw color="white" size={14} />}
                onPress={refreshContacts}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                style={{ marginTop: 12, borderRadius: 8 }}
              >
                Sync Contacts
              </Button>
            </View>
          }
        />
      </View>
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
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 12,
    height: 46,
    elevation: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#DBEAFE",
  },
  filterText: {
    color: "#64748B",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactNumber: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusChip: {
    height: 22,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
  },
});
