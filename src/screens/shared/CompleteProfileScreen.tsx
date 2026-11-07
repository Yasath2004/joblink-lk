import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "../../components/SafeScreen";
import { colors, radius, spacing } from "../../theme/theme";
import { categories } from "../../data/mockData";
import { fetchMyProfile, updateMyProfile } from "../../data/profileApi";
import {
  DocKind,
  fetchMyPrivate,
  isEmail,
  isLkPhone,
  parseNIC,
  savePrivate,
  signedDocUrl,
  submitVerification,
  uploadPrivateDoc,
} from "../../data/verifyApi";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import Chip from "../../components/Chip";
import Input from "../../components/Input";
import LocationInput from "../../components/LocationInput";

type Asset = ImagePicker.ImagePickerAsset;

const AVAILABILITY = [
  { key: "full_time", label: "Full time" },
  { key: "part_time", label: "Part time" },
  { key: "weekends", label: "Weekends" },
  { key: "anytime", label: "Any time" },
];
const BUSINESS_TYPES = [
  { key: "individual", label: "Individual" },
  { key: "small_business", label: "Small business" },
  { key: "company", label: "Company" },
];

// Take a photo or pick one from the gallery (web: gallery only)
async function pick(source: "camera" | "library", front = false): Promise<Asset | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          ...opts,
          cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
        })
      : await ImagePicker.launchImageLibraryAsync(opts);
  return res.canceled ? null : res.assets[0];
}

function choose(front = false): Promise<Asset | null> {
  if (Platform.OS === "web") return pick("library");
  return new Promise((resolve) => {
    const safe = (p: Promise<Asset | null>) => p.then(resolve).catch(() => resolve(null));
    Alert.alert(
      "Add photo",
      undefined,
      [
        { text: "Take photo", onPress: () => safe(pick("camera", front)) },
        { text: "Choose from gallery", onPress: () => safe(pick("library")) },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export default function CompleteProfileScreen({ route, navigation }: any) {
  const [step, setStep] = useState<number>(route?.params?.step ?? 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<"worker" | "employer">("worker");
  const [name, setName] = useState("");

  // step 1 (public)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<Asset | null>(null);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string | null>(null);

  // step 2 (private)
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // step 3 (private photos): saved path, local preview, newly picked file
  const [docs, setDocs] = useState<Record<DocKind, { path?: string | null; preview?: string; asset?: Asset }>>({
    nic_front: {},
    nic_back: {},
    selfie: {},
  });

  useEffect(() => {
    (async () => {
      const [p, v] = await Promise.all([fetchMyProfile(), fetchMyPrivate()]);
      if (p) {
        setRole(p.role === "employer" ? "employer" : "worker");
        setName(p.fullName);
        setAvatarUrl(p.avatarUrl ?? null);
        setLocation(p.location ?? "");
        setBio(p.bio ?? "");
        setSkills(p.skills ?? []);
        setAvailability(p.availability ?? null);
        setBusinessName(p.businessName ?? "");
        setBusinessType(p.businessType ?? null);
      }
      setEmail(v.email ?? "");
      setNic(v.nicNumber ?? "");
      setAddress(v.address ?? "");
      setEmergencyName(v.emergencyName ?? "");
      setEmergencyPhone(v.emergencyPhone ?? "");
      const paths: Record<DocKind, string | null | undefined> = {
        nic_front: v.nicFrontPath,
        nic_back: v.nicBackPath,
        selfie: v.selfiePath,
      };
      const next: any = { nic_front: {}, nic_back: {}, selfie: {} };
      await Promise.all(
        (Object.keys(paths) as DocKind[]).map(async (k) => {
          if (paths[k]) next[k] = { path: paths[k], preview: await signedDocUrl(paths[k]!) };
        })
      );
      setDocs(next);
      setLoading(false);
    })();
  }, []);

  const nicInfo = nic.trim() ? parseNIC(nic) : null;
  const clearErr = (k: string) => errors[k] && setErrors((e) => ({ ...e, [k]: "" }));
  const toggleSkill = (s: string) => setSkills((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (email.trim() && !isEmail(email)) e.email = "Enter a valid email address";
    if (nic.trim()) {
      if (!nicInfo) e.nic = "Enter a valid NIC (eg: 953421234V or 199534212345)";
      else if (nicInfo.age < 18) e.nic = "You must be at least 18 years old";
    }
    if (emergencyPhone.trim() && !isLkPhone(emergencyPhone)) e.emergencyPhone = "Enter a valid phone number (07X XXX XXXX)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveStep0 = () =>
    updateMyProfile({
      location,
      ...(role === "worker"
        ? { bio, skills, availability }
        : { bio, businessName, businessType }),
      avatar: newAvatar ? { uri: newAvatar.uri, mimeType: newAvatar.mimeType } : null,
    });

  const saveStep1 = () =>
    savePrivate({
      email: email.trim(),
      nicNumber: nic.trim().toUpperCase().replace(/\s/g, ""),
      dateOfBirth: nicInfo?.dob ?? null,
      gender: nicInfo?.gender ?? null,
      address: role === "employer" ? address.trim() : undefined,
      emergencyName: role === "worker" ? emergencyName.trim() : undefined,
      emergencyPhone: role === "worker" ? emergencyPhone.replace(/\s/g, "") : undefined,
    });

  const saveStep2 = async () => {
    const patch: any = {};
    const map: Record<DocKind, string> = { nic_front: "nicFrontPath", nic_back: "nicBackPath", selfie: "selfiePath" };
    for (const k of Object.keys(docs) as DocKind[]) {
      const a = docs[k].asset;
      if (a) patch[map[k]] = await uploadPrivateDoc(k, a.uri, a.mimeType);
    }
    if (Object.keys(patch).length) await savePrivate(patch);
    // newly uploaded files are saved now
    setDocs((d) => {
      const n: any = { ...d };
      for (const k of Object.keys(n) as DocKind[]) {
        if (n[k].asset) n[k] = { path: patch[map[k]], preview: n[k].asset.uri };
      }
      return n;
    });
  };

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setBanner("");
    try {
      await fn();
      after?.();
    } catch (e: any) {
      setBanner(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 0) return run(saveStep0, () => setStep(1));
    if (step === 1) {
      if (!validateStep1()) return;
      return run(saveStep1, () => setStep(2));
    }
  };

  const hasDoc = (k: DocKind) => !!(docs[k].path || docs[k].asset);
  const allDocs = hasDoc("nic_front") && hasDoc("nic_back") && hasDoc("selfie");
  const ready = isEmail(email) && !!nicInfo && nicInfo.age >= 18 && allDocs;

  const finish = (submit: boolean) =>
    run(
      async () => {
        await saveStep2();
        if (submit) await submitVerification();
      },
      () => navigation.navigate("VerificationHub")
    );

  const pickDoc = async (k: DocKind) => {
    try {
      const a = await choose(k === "selfie");
      if (a) setDocs((d) => ({ ...d, [k]: { ...d[k], asset: a, preview: a.uri } }));
    } catch {
      setBanner("Could not open the camera or gallery. Please allow access in your phone settings.");
    }
  };

  const pickAvatar = async () => {
    try {
      const a = await choose(true);
      if (a) setNewAvatar(a);
    } catch {
      setBanner("Could not open the camera or gallery. Please allow access in your phone settings.");
    }
  };

  const titles = ["About you", "Contact & ID", "Photos"];
  if (role === "employer") titles[0] = "About your business";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.stepLabel}>
            Step {step + 1} of 3
          </Text>
          <Text style={styles.title}>{titles[step]}</Text>
        </View>
      </View>
      <View style={styles.segments}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.segment, i <= step && styles.segmentOn]} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {!!banner && (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={16} color={colors.urgent} />
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          )}

          {loading ? (
            <Text style={styles.muted}>Loading...</Text>
          ) : step === 0 ? (
            <>
              <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
                  {newAvatar || avatarUrl ? (
                    <Image source={{ uri: (newAvatar?.uri ?? avatarUrl)! }} style={styles.avatar} />
                  ) : (
                    <Avatar name={name || "U"} color={colorFor(name || "U")} size={92} />
                  )}
                  <View style={styles.cam}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.muted}>{role === "employer" ? "Profile photo or logo" : "Profile photo"}</Text>
              </View>

              {role === "employer" && (
                <>
                  <Input
                    label="Business / employer name"
                    icon="business-outline"
                    placeholder="Eg: Perera Gardening Services"
                    value={businessName}
                    onChangeText={setBusinessName}
                  />
                  <Text style={styles.label}>Business type</Text>
                  <View style={styles.chips}>
                    {BUSINESS_TYPES.map((b) => (
                      <Chip
                        key={b.key}
                        label={b.label}
                        selected={businessType === b.key}
                        onPress={() => setBusinessType(b.key)}
                        style={styles.chip}
                      />
                    ))}
                  </View>
                </>
              )}

              <LocationInput
                label="Location"
                placeholder="Type your town or city"
                value={location}
                onChangeText={setLocation}
              />

              <Input
                label={role === "employer" ? "About your business" : "About you"}
                icon="document-text-outline"
                placeholder={
                  role === "employer"
                    ? "What kind of work do you hire for?"
                    : "Tell employers about your experience"
                }
                multiline
                value={bio}
                onChangeText={setBio}
                style={{ minHeight: 70, textAlignVertical: "top" }}
              />

              {role === "worker" && (
                <>
                  <Text style={styles.label}>Your skills</Text>
                  <View style={styles.chips}>
                    {categories.map((c) => (
                      <Chip key={c} label={c} selected={skills.includes(c)} onPress={() => toggleSkill(c)} style={styles.chip} />
                    ))}
                  </View>
                  <Text style={styles.label}>Availability</Text>
                  <View style={styles.chips}>
                    {AVAILABILITY.map((a) => (
                      <Chip
                        key={a.key}
                        label={a.label}
                        selected={availability === a.key}
                        onPress={() => setAvailability(a.key)}
                        style={styles.chip}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : step === 1 ? (
            <>
              <View style={styles.note}>
                <Ionicons name="lock-closed" size={16} color={colors.primaryDark} />
                <Text style={styles.noteText}>These details are private. Only our verification team can see them.</Text>
              </View>

              <Input
                label="Email address"
                icon="mail-outline"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  clearErr("email");
                }}
              />
              {!!errors.email && <Text style={styles.err}>{errors.email}</Text>}

              <Input
                label="NIC number"
                icon="card-outline"
                placeholder="953421234V or 199534212345"
                autoCapitalize="characters"
                value={nic}
                onChangeText={(v) => {
                  setNic(v);
                  clearErr("nic");
                }}
              />
              {!!errors.nic && <Text style={styles.err}>{errors.nic}</Text>}
              {!errors.nic && !!nicInfo && nicInfo.age >= 18 && (
                <Text style={styles.ok}>
                  ✓ {nicInfo.gender === "male" ? "Male" : "Female"} · born{" "}
                  {new Date(nicInfo.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (age{" "}
                  {nicInfo.age})
                </Text>
              )}

              {role === "worker" ? (
                <>
                  <Text style={[styles.label, { marginTop: spacing.md }]}>Emergency contact</Text>
                  <Input
                    icon="person-outline"
                    placeholder="Name (eg: your mother, brother)"
                    value={emergencyName}
                    onChangeText={setEmergencyName}
                  />
                  <Input
                    icon="call-outline"
                    placeholder="07X XXX XXXX"
                    keyboardType="phone-pad"
                    value={emergencyPhone}
                    onChangeText={(v) => {
                      setEmergencyPhone(v);
                      clearErr("emergencyPhone");
                    }}
                  />
                  {!!errors.emergencyPhone && <Text style={styles.err}>{errors.emergencyPhone}</Text>}
                </>
              ) : (
                <Input
                  label="Full address"
                  icon="home-outline"
                  placeholder="House no, street, town"
                  multiline
                  value={address}
                  onChangeText={setAddress}
                  style={{ minHeight: 60, textAlignVertical: "top" }}
                />
              )}
            </>
          ) : (
            <>
              <View style={styles.note}>
                <Ionicons name="lock-closed" size={16} color={colors.primaryDark} />
                <Text style={styles.noteText}>
                  Your photos are stored privately. They are only used to verify your identity and are never shown to other users.
                </Text>
              </View>
              <DocTile label="NIC - front side" icon="card-outline" uri={docs.nic_front.preview} onPress={() => pickDoc("nic_front")} />
              <DocTile label="NIC - back side" icon="card-outline" uri={docs.nic_back.preview} onPress={() => pickDoc("nic_back")} />
              <DocTile label="Selfie (your face, clearly visible)" icon="person-circle-outline" uri={docs.selfie.preview} onPress={() => pickDoc("selfie")} />

              {!ready && (
                <Text style={styles.muted}>
                  To submit for verification you need: a valid email, your NIC number and all 3 photos.
                </Text>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 2 ? (
            <Button label={step === 0 ? "Save & continue" : "Save & continue"} icon="arrow-forward" loading={busy} onPress={next} />
          ) : (
            <>
              <Button
                label="Submit for verification"
                icon="shield-checkmark"
                disabled={!ready}
                loading={busy}
                onPress={() => finish(true)}
              />
              <TouchableOpacity onPress={() => finish(false)} disabled={busy} style={{ alignItems: "center", marginTop: spacing.md }}>
                <Text style={styles.later}>Save and finish later</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DocTile({ label, icon, uri, onPress }: { label: string; icon: any; uri?: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.doc}>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.docImg} resizeMode="cover" />
          <View style={styles.docDone}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.docDoneText}> Added · tap to change</Text>
          </View>
        </>
      ) : (
        <View style={styles.docEmpty}>
          <Ionicons name={icon} size={30} color={colors.textMuted} />
          <Text style={styles.docLabel}>{label}</Text>
          <Text style={styles.docHint}>Tap to take a photo or choose one</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  title: { fontSize: 20, fontWeight: "800", color: colors.textDark },
  segments: { flexDirection: "row", paddingHorizontal: spacing.xl, marginTop: spacing.md },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border, marginRight: 6 },
  segmentOn: { backgroundColor: colors.primary },
  banner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.urgentBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  bannerText: { flex: 1, marginLeft: 8, fontSize: 12, color: colors.urgent, fontWeight: "600" },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  cam: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
  chip: { marginRight: spacing.sm, marginBottom: spacing.sm },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  noteText: { flex: 1, marginLeft: 8, fontSize: 12, color: colors.textBody, lineHeight: 17 },
  err: { color: colors.urgent, fontSize: 11, fontWeight: "600", marginTop: -spacing.md, marginBottom: spacing.md },
  ok: { color: colors.success, fontSize: 12, fontWeight: "700", marginTop: -spacing.md, marginBottom: spacing.lg },
  doc: { height: 150, borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.lg, backgroundColor: "#fff", borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border },
  docImg: { width: "100%", height: "100%" },
  docDone: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 6 },
  docDoneText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  docEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md },
  docLabel: { fontSize: 13, fontWeight: "700", color: colors.textDark, marginTop: 6, textAlign: "center" },
  docHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.lg, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
  later: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
});
