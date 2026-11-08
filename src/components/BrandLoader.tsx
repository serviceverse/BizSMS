import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Text,
  ActivityIndicator,
} from "react-native";

interface BrandLoaderProps {
  message?: string;
  size?: number;
}

export default function BrandLoader({
  message = "Loading BizSMS...",
  size = 72,
}: BrandLoaderProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim, glowAnim]);

  return (
    <View style={styles.container}>
      {/* Animated Glowing Logo Badge */}
      <View style={styles.badgeWrapper}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: size + 32,
              height: size + 32,
              borderRadius: (size + 32) / 2,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoContainer,
            {
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image
            source={require("../assets/logo.png")}
            style={{ width: size, height: size }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Brand Title & Product Tagline */}
      <Text style={styles.brandTitle}>BizSMS</Text>
      <Text style={styles.brandSubtitle}>A Product of The Serviceverse</Text>

      {/* Spinner & Dynamic Status Message */}
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* Official Parent Company Link */}
      <Text style={styles.websiteText}>theserviceverse.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  badgeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  glowRing: {
    position: "absolute",
    backgroundColor: "rgba(37, 99, 235, 0.2)",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00051B",
    elevation: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: "#3B82F6",
    overflow: "hidden",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  messageText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  websiteText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 18,
    fontWeight: "600",
  },
});

