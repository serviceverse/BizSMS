import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { ShieldCheck, KeyRound, Globe, ExternalLink } from "lucide-react-native";
import BrandLoader from "../components/BrandLoader";
import { colors } from "../theme/theme";

const AUTH_CODE = "SDMCH723326";

export default function AuthGate({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await AsyncStorage.getItem("authenticated");
      if (isAuth === "true") {
        onAuthenticated();
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleVerify = async () => {
    if (code.trim() === AUTH_CODE) {
      await AsyncStorage.setItem("authenticated", "true");
      onAuthenticated();
    } else {
      setError("❌ Invalid access key. Please check and retry.");
    }
  };

  const openCompanyWebsite = () => {
    Linking.openURL("https://theserviceverse.com").catch((err) =>
      console.warn("Could not open website:", err)
    );
  };

  if (loading) {
    return <BrandLoader message="Verifying License & Serviceverse Access..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.outer}
    >
      <View style={styles.brandingHeader}>
        {/* The Serviceverse Brand Logo */}
        <View style={styles.logoBadge}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>BizSMS</Text>
        <Text style={styles.appTagline}>
          Commercial Call Auto-Pilot & SMS CRM
        </Text>
        <TouchableOpacity
          style={styles.parentCompanyBadge}
          onPress={openCompanyWebsite}
          activeOpacity={0.8}
        >
          <Text style={styles.parentCompanyText}>
            A Product of <Text style={styles.parentCompanyBold}>The Serviceverse</Text>
          </Text>
          <ExternalLink color="#2563EB" size={12} />
        </TouchableOpacity>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <KeyRound color="#2563EB" size={20} />
            <Text style={styles.title}>Activate Account</Text>
          </View>
          <Text style={styles.instructions}>
            Enter your enterprise license or setup access code to continue.
          </Text>

          <TextInput
            mode="outlined"
            label="License / Access Code"
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setError("");
            }}
            secureTextEntry
            textColor={colors.textPrimary}
            placeholderTextColor={colors.textPlaceholder}
            outlineColor={colors.borderInput}
            activeOutlineColor={colors.primary}
            style={styles.input}
            autoCapitalize="characters"
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleVerify}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.button}
            contentStyle={{ paddingVertical: 6 }}
          >
            Activate & Enter
          </Button>

          <View style={styles.footerNote}>
            <ShieldCheck color="#10B981" size={16} />
            <Text style={styles.footerNoteText}>
              Commercial reliability & direct SIM cellular messaging
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Official Parent Company Copyright Footer */}
      <View style={styles.copyrightContainer}>
        <TouchableOpacity
          onPress={openCompanyWebsite}
          style={styles.websiteRow}
          activeOpacity={0.7}
        >
          <Globe color="#64748B" size={13} />
          <Text style={styles.websiteUrl}>theserviceverse.com</Text>
        </TouchableOpacity>
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} The Serviceverse. All rights reserved.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  brandingHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#00051B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  parentCompanyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  parentCompanyText: {
    fontSize: 12,
    color: "#1E40AF",
  },
  parentCompanyBold: {
    fontWeight: "800",
    color: "#2563EB",
  },
  card: {
    padding: 10,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: "#FFFFFF",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  instructions: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "600",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  footerNoteText: {
    fontSize: 11,
    color: "#64748B",
  },
  copyrightContainer: {
    alignItems: "center",
    marginTop: 28,
  },
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  websiteUrl: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  copyrightText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
});

