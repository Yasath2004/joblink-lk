import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { LanguageProvider } from "./src/i18n/LanguageContext";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
