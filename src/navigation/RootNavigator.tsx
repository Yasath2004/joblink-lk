import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/onboarding/SplashScreen";
import LoginScreen from "../screens/onboarding/LoginScreen";
import RoleSelectScreen from "../screens/onboarding/RoleSelectScreen";
import RegisterScreen from "../screens/onboarding/RegisterScreen";
import ProfileSetupScreen from "../screens/onboarding/ProfileSetupScreen";
import SkillsSelectScreen from "../screens/onboarding/SkillsSelectScreen";

import WorkerTabs from "./WorkerTabs";
import EmployerTabs from "./EmployerTabs";

import JobDetailsScreen from "../screens/worker/JobDetailsScreen";
import ChatScreen from "../screens/shared/ChatScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import SettingsScreen from "../screens/shared/SettingsScreen";
import ApplicantsScreen from "../screens/employer/ApplicantsScreen";
import ApplicantProfileScreen from "../screens/employer/ApplicantProfileScreen";
import PostJobScreen from "../screens/employer/PostJobScreen";
import MyJobsScreen from "../screens/employer/MyJobsScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        {/* Onboarding */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="SkillsSelect" component={SkillsSelectScreen} />

        {/* Role-based tab flows */}
        <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
        <Stack.Screen name="EmployerTabs" component={EmployerTabs} />

        {/* Shared / detail screens reachable from either flow */}
        <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Applicants" component={ApplicantsScreen} />
        <Stack.Screen name="ApplicantProfile" component={ApplicantProfileScreen} />
        <Stack.Screen name="PostJob" component={PostJobScreen} />
        <Stack.Screen name="EditJob" component={PostJobScreen} />
        <Stack.Screen name="MyJobs" component={MyJobsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
