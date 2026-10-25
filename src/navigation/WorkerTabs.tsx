import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import HomeScreen from "../screens/worker/HomeScreen";
import ApplicationsScreen from "../screens/worker/ApplicationsScreen";
import MessagesScreen from "../screens/shared/MessagesScreen";
import WorkerProfileScreen from "../screens/worker/WorkerProfileScreen";
import { useLanguage } from "../i18n/LanguageContext";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Applied: "document-text",
  Messages: "chatbubble",
  Profile: "person",
};

export default function WorkerTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={(focused ? ICONS[route.name] : (`${ICONS[route.name]}-outline` as any)) as any}
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("home") }} />
      <Tab.Screen name="Applied" component={ApplicationsScreen} options={{ tabBarLabel: t("applied") }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: t("messages") }} />
      <Tab.Screen name="Profile" component={WorkerProfileScreen} options={{ tabBarLabel: t("profile") }} />
    </Tab.Navigator>
  );
}
