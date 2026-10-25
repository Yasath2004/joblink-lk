import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import MyJobsScreen from "../screens/employer/MyJobsScreen";
import PostJobScreen from "../screens/employer/PostJobScreen";
import MessagesScreen from "../screens/shared/MessagesScreen";
import EmployerProfileScreen from "../screens/employer/EmployerProfileScreen";
import { useLanguage } from "../i18n/LanguageContext";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "My Jobs": "briefcase",
  "Post Job": "add-circle",
  Messages: "chatbubble",
  Profile: "person",
};

export default function EmployerTabs() {
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
      <Tab.Screen name="My Jobs" component={MyJobsScreen} options={{ tabBarLabel: t("my_jobs") }} />
      <Tab.Screen name="Post Job" component={PostJobScreen} options={{ tabBarLabel: t("post_job_tab") }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: t("messages") }} />
      <Tab.Screen name="Profile" component={EmployerProfileScreen} options={{ tabBarLabel: t("profile") }} />
    </Tab.Navigator>
  );
}
