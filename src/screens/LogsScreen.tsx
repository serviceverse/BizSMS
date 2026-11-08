import React, { useContext, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { AppContext, Log } from "../context/AppContext";
import { Text, Appbar, Chip, Button } from "react-native-paper";
import { colors } from "../theme/theme";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  RotateCw,
  Trash2,
  PhoneMissed,
  PhoneCall,
  Sparkles,
  Send,
} from "lucide-react-native";

export default function LogsScreen({ navigation }: { navigation?: any }) {
  const { logs, refreshLogs, retryFailedLog, clearLogs } = useContext(AppContext);
  const [filter, setFilter] = useState<"all" | "sent" | "failed">("all");
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const filteredLogs = logs.filter((l) => {
    if (filter === "sent") return l.status === "sent";
    if (filter === "failed") return l.status === "failed";
    return true;
  });

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    const success = await retryFailedLog(id);
    setRetryingId(null);
    if (!success) {
      Alert.alert("Retry Failed", "Could not dispatch SMS. Check SIM signal or carrier balance.");
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Clear All Logs",
      "Are you sure you want to delete all transmission logs?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearLogs },
      ]
    );
  };

  const getTriggerIcon = (trigger?: string) => {
    switch (trigger) {
      case "missed_call":
        return <PhoneMissed color="#DC2626" size={14} />;
      case "call_ended":
        return <PhoneCall color="#16A34A" size={14} />;
      case "campaign":
        return <Sparkles color="#2563EB" size={14} />;
      default:
        return <Send color="#64748B" size={14} />;
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        {navigation?.canGoBack() && (
          <Appbar.BackAction onPress={() => navigation.goBack()} />
        )}
        <Appbar.Content
          title="Delivery Audit Logs"
          subtitle={`${logs.length} total recorded dispatches`}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action
          icon={() => <Trash2 color="#EF4444" size={20} />}
          onPress={handleClear}
        />
        <Appbar.Action
          icon={() => <RefreshCcw color="#2563EB" size={20} />}
          onPress={refreshLogs}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Chip
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
          >
            All ({logs.length})
          </Chip>
          <Chip
            selected={filter === "sent"}
            onPress={() => setFilter("sent")}
            style={[
              styles.filterChip,
              filter === "sent" && { backgroundColor: "#DCFCE7" },
            ]}
            textStyle={{
              color: filter === "sent" ? "#166534" : "#64748B",
              fontWeight: "700",
            }}
          >
            Delivered ({logs.filter((l) => l.status === "sent").length})
          </Chip>
          <Chip
            selected={filter === "failed"}
            onPress={() => setFilter("failed")}
            style={[
              styles.filterChip,
              filter === "failed" && { backgroundColor: "#FEE2E2" },
            ]}
            textStyle={{
              color: filter === "failed" ? "#991B1B" : "#64748B",
              fontWeight: "700",
            }}
          >
            Failed ({logs.filter((l) => l.status === "failed").length})
          </Chip>
        </View>

        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id.toString()}
          initialNumToRender={15}
          renderItem={({ item }) => {
            const isSent = item.status === "sent";
            const timeStr = item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date(item.id).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            return (
              <View style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {isSent ? (
                      <CheckCircle2 color="#10B981" size={20} />
                    ) : (
                      <XCircle color="#EF4444" size={20} />
                    )}
                    <Text style={styles.logNumber}>{item.number}</Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={styles.triggerBadge}>
                      {getTriggerIcon(item.trigger)}
                      <Text style={styles.triggerText}>
                        {(item.trigger || "manual").replace("_", " ")}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>
                </View>

                <Text style={styles.logMessage}>{item.message}</Text>

                {!isSent && (
                  <View style={styles.retryRow}>
                    <Button
                      mode="outlined"
                      icon={() => <RotateCw color={colors.danger} size={14} />}
                      onPress={() => handleRetry(item.id)}
                      loading={retryingId === item.id}
                      compact
                      style={[styles.retryBtn, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg }]}
                      textColor={colors.danger}
                    >
                      Retry SMS
                    </Button>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={styles.emptyText}>No logs for this filter</Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#DBEAFE",
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  triggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  triggerText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  logMessage: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  retryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
  },
});
