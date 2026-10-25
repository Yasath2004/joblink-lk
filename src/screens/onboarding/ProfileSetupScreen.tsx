import React, { useState } from "react";
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { updateMyProfile } from "../../data/profileApi";
import LocationInput from "../../components/LocationInput";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing } from "../../theme/theme";
import Input from "../../components/Input";
import Button from "../../components/Button";

export default function ProfileSetupScreen({ navigation }: any) {
  const [location, setLocation] = useState("");
  const [nic, setNic] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "JobLink LK needs access to your photos so you can add a profile picture."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMime(result.assets[0].mimeType ?? null);
    }
  };

  const handleNext = async () => {
    if (!location.trim()) {
      setError("Please enter your location");
      return;
    }
    setError("");
    setSaving(true);
    try {
      // NIC is only checked on screen, it is never stored in the database.
      await updateMyProfile({
        location,
        avatar: photoUri ? { uri: photoUri, mimeType: photoMime } : null,
      });
      navigation.navigate("SkillsSelect");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.step}>Step 1 of 2</Text>
        <Text style={styles.title}>Set up your profile</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoCircle}>
                <Ionicons name="camera-outline" size={22} color={colors.primaryDark} />
              </View>
            )}
            <Text style={styles.photoText}>{photoUri ? "Change photo" : "Add photo"}</Text>
            <Text style={styles.photoHint}>A photo helps employers trust you</Text>
          </TouchableOpacity>

          <LocationInput
            label="Your Location"
            placeholder="Type your town or city"
            value={location}
            onChangeText={(v) => {
              setLocation(v);
              if (error) setError("");
            }}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Input
            label="NIC Number (optional)"
            icon="card-outline"
            placeholder="XXX XXX XXXX X"
            hint="Used for identity verification badge"
            value={nic}
            onChangeText={setNic}
          />

          <Button label="Next: Select Skills" icon="arrow-forward" loading={saving} onPress={handleNext} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: spacing.lg },
  step: { fontSize: 12, color: colors.textOnDarkMuted, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 4, marginBottom: spacing.xl },
  card: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  photoWrap: { alignItems: "center", marginBottom: spacing.xl },
  photoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceMint,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  photoImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: spacing.sm,
  },
  photoText: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  photoHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  errorText: { color: colors.urgent, fontSize: 11, fontWeight: "600", marginTop: -spacing.md, marginBottom: spacing.md },
});
