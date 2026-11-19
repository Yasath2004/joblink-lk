import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "../../components/SafeScreen";
import { colors, spacing } from "../../theme/theme";
import { Job } from "../../data/mockData";
import { fetchFavoriteJobs } from "../../data/jobsApi";
import JobCard from "../../components/JobCard";

export default function SavedJobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // reload every time the screen is opened (a job may have been un-saved on the details screen)
  useFocusEffect(
    useCallback(() => {
      fetchFavoriteJobs()
        .then(setJobs)
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved jobs</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: spacing.xl }}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => navigation.navigate("JobDetails", { job: item })} />
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No saved jobs yet. Tap the heart on a job to save it.</Text>
            </View>
          )
        }
      />
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
  title: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, textAlign: "center" },
});
