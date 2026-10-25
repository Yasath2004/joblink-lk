import React, { useState } from "react";
import { Alert, Image, Platform, SafeAreaView, Switch, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimeField from "../../components/DateTimeField";
import LocationInput from "../../components/LocationInput";
import { Place } from "../../data/geoApi";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing } from "../../theme/theme";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { categories, Job } from "../../data/mockData";
import { createJob, updateJob } from "../../data/jobsApi";

const PAY_TYPES = ["Fixed", "Per day", "Per trip"];

const parseDate = (s?: string) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const parseTime = (s?: string) => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function PostJobScreen({ navigation, route }: any) {
  // Opened as "EditJob" with { job } -> edit mode. Opened from the Post Job tab -> create mode.
  const editing: Job | undefined = route?.params?.job;
  const isEdit = !!editing;
  const minWorkers = Math.max(1, editing?.filled ?? 1);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<string | null>(editing?.category ?? null);
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [pay, setPay] = useState(editing ? String(editing.pay) : "");
  const [payType, setPayType] = useState(editing ? cap(editing.payType) : "Fixed");
  const [showPayTypes, setShowPayTypes] = useState(false);
  const [location, setLocation] = useState(editing?.location ?? "");

  const [date, setDate] = useState<Date | null>(parseDate(editing?.rawDate));
  const [time, setTime] = useState<Date | null>(parseTime(editing?.rawTime));

  const [place, setPlace] = useState<Place | null>(
    editing?.lat != null && editing?.lng != null ? { label: editing.location, lat: editing.lat, lng: editing.lng } : null
  );
  const [urgent, setUrgent] = useState(!!editing?.urgent);
  const [workers, setWorkers] = useState(editing?.workersNeeded ?? 1);
  const [existingImage, setExistingImage] = useState<string | null>(editing?.imageUrl ?? null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [posting, setPosting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Job title is required";
    if (!category) next.category = "Select a category";
    if (!description.trim()) next.description = "Description is required";
    if (!pay.trim() || isNaN(Number(pay)) || Number(pay) <= 0) next.pay = "Enter a valid amount";
    if (!location.trim()) next.location = "Location is required";
    if (!date) next.date = "Select a date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!res.canceled) setPhoto(res.assets[0]);
  };

  const submit = async () => {
    if (!validate()) return;
    setPosting(true);
    try {
      const data = {
        title,
        category: category!,
        description,
        pay: Number(pay),
        payType,
        location,
        date,
        time,
        urgent,
        workersNeeded: workers,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        image: photo ? { uri: photo.uri, mimeType: photo.mimeType } : null,
      };
      if (isEdit) {
        const imageAction = photo ? "replace" : existingImage ? "keep" : editing?.imageUrl ? "remove" : "keep";
        await updateJob(editing!.id, data, imageAction);
        navigation.goBack();
      } else {
        await createJob(data);
        // clear the form so the next job starts empty
        setTitle("");
        setCategory(null);
        setDescription("");
        setPay("");
        setPayType("Fixed");
        setLocation("");
        setDate(null);
        setTime(null);
        setPlace(null);
        setUrgent(false);
        setWorkers(1);
        setPhoto(null);
        navigation.navigate("MyJobs");
      }
    } catch (e: any) {
      Alert.alert("Could not post job", e?.message ?? "Something went wrong");
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Edit Job" : "Post a New Job"}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
        <Text style={styles.subtitle}>Fill in the details to find the right worker</Text>

        <Input
          label="Job Title"
          placeholder="Eg: Lawn mowing at my house"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (errors.title) setErrors((e) => ({ ...e, title: "" }));
          }}
        />
        {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategories((s) => !s)}>
          <Text style={category ? styles.selectValue : styles.selectPlaceholder}>
            {category || "Select a category"}
          </Text>
          <Ionicons name={showCategories ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </TouchableOpacity>
        {!!errors.category && !showCategories && <Text style={styles.errorText}>{errors.category}</Text>}
        {showCategories && (
          <View style={styles.dropdown}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.dropdownItem}
                onPress={() => {
                  setCategory(c);
                  setShowCategories(false);
                  setErrors((e) => ({ ...e, category: "" }));
                }}
              >
                <Text style={styles.dropdownText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Description</Text>
        <Input
          placeholder="Describe the job in detail — what needs to be done, tools needed, etc."
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            if (errors.description) setErrors((e) => ({ ...e, description: "" }));
          }}
          multiline
          numberOfLines={4}
          style={{ height: 90, textAlignVertical: "top", paddingTop: spacing.sm }}
        />
        {!!errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

        <Text style={styles.label}>Photo (optional)</Text>
        {photo || existingImage ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: (photo?.uri ?? existingImage)! }} style={styles.photo} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => {
                setPhoto(null);
                setExistingImage(null);
              }}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
            <Ionicons name="image-outline" size={26} color={colors.textMuted} />
            <Text style={styles.photoAddText}>Tap to add a photo</Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg }}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Workers needed</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setWorkers((w) => Math.max(minWorkers, w - 1))}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="remove" size={18} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.textDark }}>{workers}</Text>
            <TouchableOpacity
              onPress={() => setWorkers((w) => Math.min(100, w + 1))}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg }}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Mark as urgent</Text>
          <Switch value={urgent} onValueChange={setUrgent} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Input
              label="Pay (Rs.)"
              keyboardType="numeric"
              value={pay}
              onChangeText={(v) => {
                setPay(v);
                if (errors.pay) setErrors((e) => ({ ...e, pay: "" }));
              }}
              icon="cash-outline"
            />
            {!!errors.pay && <Text style={[styles.errorText, { marginTop: -spacing.md }]}>{errors.pay}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Pay Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowPayTypes((s) => !s)}>
              <Text style={styles.selectValue}>{payType}</Text>
              <Ionicons name={showPayTypes ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {showPayTypes && (
              <View style={styles.dropdown}>
                {PAY_TYPES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setPayType(p);
                      setShowPayTypes(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <LocationInput
          label="Location"
          placeholder="Type a place in Sri Lanka, eg: Anuradhapura"
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            if (errors.location) setErrors((e) => ({ ...e, location: "" }));
          }}
          onPlace={setPlace}
        />
        {!!errors.location && <Text style={[styles.errorText, { marginTop: -spacing.md }]}>{errors.location}</Text>}

        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.label}>Date</Text>
            <DateTimeField
              mode="date"
              value={date}
              onChange={(d) => {
                setDate(d);
                if (errors.date) setErrors((e) => ({ ...e, date: "" }));
              }}
            />
            {!!errors.date && <Text style={[styles.errorText, { marginTop: -spacing.md }]}>{errors.date}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start Time</Text>
            <DateTimeField mode="time" value={time} onChange={setTime} />
          </View>
        </View>

        <Button
          label={isEdit ? "Save Changes" : "Post Job"}
          icon="checkmark"
          variant="amber"
          loading={posting}
          style={{ marginTop: spacing.lg }}
          onPress={submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textBody, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: spacing.sm },
  errorText: { color: colors.urgent, fontSize: 11, fontWeight: "600", marginBottom: spacing.md, marginTop: -spacing.sm },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
    marginBottom: spacing.lg,
  },
  selectValue: { fontSize: 14, color: colors.textDark, fontWeight: "600" },
  selectPlaceholder: { fontSize: 14, color: colors.textMuted },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { fontSize: 13, color: colors.textDark },
  row2: { flexDirection: "row" },
  photoAdd: {
    height: 110,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  photoAddText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  photoWrap: { marginBottom: spacing.lg },
  photo: { width: "100%", height: 170, borderRadius: radius.md },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
