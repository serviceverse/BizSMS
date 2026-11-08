import React from "react";
import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "../screens/DashboardScreen";
import AutomationsScreen from "../screens/AutomationsScreen";
import CampaignsScreen from "../screens/CampaignsScreen";
import ContactsScreen from "../screens/ContactsScreen";
import BusinessProfileScreen from "../screens/BusinessProfileScreen";
import LogsScreen from "../screens/LogsScreen";
import { colors } from "../theme/theme";

import {
  LayoutDashboard,
  Zap,
  Sparkles,
  Users,
  Store,
  FileText,
} from "lucide-react-native";

export type RootTabParamList = {
  Dashboard: undefined;
  Automations: undefined;
  Campaigns: undefined;
  Contacts: undefined;
  Profile: undefined;
  Logs: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "android" ? 64 : 68,
          paddingBottom: Platform.OS === "android" ? 8 : 12,
          paddingTop: 8,
          elevation: 10,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, focused }) => {
          const iconSize = 21;
          switch (route.name) {
            case "Dashboard":
              return <LayoutDashboard color={color} size={iconSize} />;
            case "Automations":
              return <Zap color={color} size={iconSize} />;
            case "Campaigns":
              return <Sparkles color={color} size={iconSize} />;
            case "Contacts":
              return <Users color={color} size={iconSize} />;
            case "Profile":
              return <Store color={color} size={iconSize} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="Automations"
        component={AutomationsScreen}
        options={{ tabBarLabel: "Automations" }}
      />
      <Tab.Screen
        name="Campaigns"
        component={CampaignsScreen}
        options={{ tabBarLabel: "Broadcasts" }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ tabBarLabel: "Contacts" }}
      />
      <Tab.Screen
        name="Profile"
        component={BusinessProfileScreen}
        options={{ tabBarLabel: "Card & Biz" }}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
