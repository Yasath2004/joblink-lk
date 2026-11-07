import React from "react";
import { SafeAreaView as RNSafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

// Pads the top (status bar / notch) and sides on every device, including Android.
// The bottom is left to the tab bar / sticky footers of each screen.
export function SafeAreaView(props: SafeAreaViewProps) {
  return <RNSafeAreaView edges={["top", "left", "right"]} {...props} />;
}
