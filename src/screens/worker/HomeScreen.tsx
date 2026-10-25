import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { categories, categoryColor, categoryIcon, Job } from "../../data/mockData";
import { AppStatus, fetchJobs, fetchMarketStats, fetchMyApplicationStatuses, MarketStats } from "../../data/jobsApi";
import { fetchMyProfile } from "../../data/profileApi";
import { unreadNotificationCount } from "../../data/socialApi";
import Chip from "../../components/Chip";
import JobCard from "../../components/JobCard";
import { useLanguage } from "../../i18n/LanguageContext";

const STATUS_LOOK: Record<AppStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Applied", bg: colors.amberBg, color: colors.amber },
  accepted: { label: "Accepted", bg: colors.successBg, color: colors.success },
  rejected: { label: "Declined", bg: colors.urgentBg, color: colors.urgent },
};

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(Math.round(n)));

export default function HomeScreen({ navigation }: any) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myName, setMyName] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AppStatus>>({});
  const [dbStats, setDbStats] = useState<MarketStats | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [j, st, stats, p, n] = await Promise.all([
      fetchJobs(),
      fetchMyApplicationStatuses(),
      fetchMarketStats(),
      fetchMyProfile(),
      unreadNotificationCount(),
    ]);
    setJobs(j);
    setStatuses(st);
    setDbStats(stats);
    setMyName(p?.fullName ?? "");
    setUnread(n);
    setLoading(false);
  }, []);

  // Reload every time this tab comes into focus (e.g. after posting a job)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Greeting changes with the time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("good_morning") : hour < 18 ? t("good_afternoon") : t("good_evening");

  // Stats come from the database function; if it is not installed yet, compute from the loaded jobs
  const stats: MarketStats = useMemo(() => {
    if (dbStats) return dbStats;
    const pays = jobs.map((j) => j.pay);
    return {
      openJobs: jobs.length,
      urgentJobs: jobs.filter((j) => j.urgent).length,
      avgPay: pays.length ? pays.reduce((a, b) => a + b, 0) / pays.length : 0,
      openPositions: jobs.reduce((a, j) => a + Math.max(0, (j.workersNeeded ?? 1) - (j.filled ?? 0)), 0),
    };
  }, [dbStats, jobs]);

  const filtered = useMemo(() => {
    const byCategory = filter === "All" ? jobs : jobs.filter((j) => j.category === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
    );
  }, [filter, query, jobs]);

  // Urgent jobs slide at the top; the list below shows the rest (while searching, everything is in the list)
  const searching = query.trim().length > 0;
  const urgentList = searching ? [] : filtered.filter((j) => j.urgent);
  const restList = searching ? filtered : filtered.filter((j) => !j.urgent);

  // ---------- urgent slider ----------
  const slideW = width - spacing.xl * 2;
  const interval = slideW + spacing.md;
  const sliderRef = useRef<FlatList<Job>>(null);
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);
  slideRef.current = slide;

  useEffect(() => {
    setSlide(0);
  }, [urgentList.length, filter]);

  useEffect(() => {
    if (urgentList.length < 2) return;
    const id = setInterval(() => {
      const next = (slideRef.current + 1) % urgentList.length;
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
      setSlide(next);
    }, 4500);
    return () => clearInterval(id);
  }, [urgentList.length]);

  const renderSlide = ({ item }: { item: Job }) => {
    const accent = categoryColor[item.category];
    const left = Math.max(0, (item.workersNeeded ?? 1) - (item.filled ?? 0));
    const look = statuses[item.id] ? STATUS_LOOK[statuses[item.id]] : null;
    const body = (
      <>
        <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.78)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.slideTop}>
          <View style={styles.urgentTag}>
            <Ionicons name="flame" size={11} color="#fff" />
            <Text style={styles.urgentTagText}> URGENT</Text>
          </View>
          {look && (
            <View style={[styles.slideStatus, { backgroundColor: look.bg }]}>
              <Text style={[styles.slideStatusText, { color: look.color }]}>{look.label}</Text>
            </View>
          )}
        </View>
        <View style={styles.slideBottom}>
          <Text style={styles.slideTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.slideRow}>
            <Text style={styles.slidePay}>Rs. {item.pay.toLocaleString()}</Text>
            <Text style={styles.slideMeta}> · {item.payType}</Text>
          </View>
          <View style={styles.slideRow}>
            <Ionicons name="location-outline" size={12} color="#fff" />
            <Text style={[styles.slideMeta, { flex: 1 }]} numberOfLines={1}>
              {" "}
              {item.location}
            </Text>
            <Ionicons name="people-outline" size={12} color="#fff" />
            <Text style={styles.slideMeta}> {left} {left === 1 ? "spot" : "spots"} left</Text>
          </View>
        </View>
      </>
    );
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigation.navigate("JobDetails", { job: item })}
        style={[styles.slide, { width: slideW }]}
      >
        {item.imageUrl ? (
          <ImageBackground source={{ uri: item.imageUrl }} style={styles.slideFill} imageStyle={{ borderRadius: radius.lg }}>
            {body}
          </ImageBackground>
        ) : (
          <View style={[styles.slideFill, { backgroundColor: accent }]}>
            <Ionicons name={categoryIcon[item.category] as any} size={90} color="rgba(255,255,255,0.18)" style={styles.slideBgIcon} />
            {body}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      <FlatList
        data={["All", ...categories]}
        keyExtractor={(i) => i}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.xl }}
        renderItem={({ item }) => (
          <Chip label={item} selected={filter === item} onPress={() => setFilter(item)} style={{ marginRight: spacing.sm }} />
        )}
      />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, shadow.card]}>
          <Text style={styles.statNum}>{stats.openJobs}</Text>
          <Text style={styles.statLabel}>OPEN JOBS</Text>
        </View>
        <View style={[styles.statCard, shadow.card]}>
          <Text style={[styles.statNum, stats.urgentJobs > 0 && { color: colors.urgent }]}>{stats.urgentJobs}</Text>
          <Text style={styles.statLabel}>URGENT</Text>
        </View>
        <View style={[styles.statCard, shadow.card, { marginRight: 0 }]}>
          <Text style={styles.statNum}>{stats.avgPay > 0 ? compact(stats.avgPay) : "–"}</Text>
          <Text style={styles.statLabel}>AVG PAY (RS.)</Text>
        </View>
      </View>

      {urgentList.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>🔥 Urgent now</Text>
            <Text style={styles.sectionCount}>{urgentList.length}</Text>
          </View>
          <FlatList
            ref={sliderRef}
            data={urgentList}
            keyExtractor={(j) => j.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
            contentContainerStyle={{ paddingHorizontal: spacing.xl }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / interval))}
            renderItem={renderSlide}
          />
          {urgentList.length > 1 && (
            <View style={styles.dots}>
              {urgentList.map((j, i) => (
                <View key={j.id} style={[styles.dotItem, i === slide && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{searching ? "Results" : urgentList.length > 0 ? "Latest jobs" : "All jobs"}</Text>
        <Text style={styles.sectionCount}>
          {restList.length} {t("jobs_found")}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{myName.split(" ")[0] || "there"}</Text>
            <Text style={{ fontSize: 16 }}> 👋</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.bell}>
          <Ionicons name="notifications-outline" size={20} color={colors.textDark} />
          {unread > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("search_jobs_placeholder")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={restList}
        keyExtractor={(j) => j.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : urgentList.length > 0 ? null : (
            <View style={styles.empty}>
              <Ionicons name={searching ? "search-outline" : "briefcase-outline"} size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>{searching ? t("no_jobs_found") : "No open jobs yet. Pull down to refresh."}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <JobCard job={item} status={statuses[item.id]} onPress={() => navigation.navigate("JobDetails", { job: item })} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark },
  sectionCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  slide: { height: 176 },
  slideFill: { flex: 1, borderRadius: radius.lg, overflow: "hidden", justifyContent: "space-between", padding: spacing.md },
  slideBgIcon: { position: "absolute", right: -6, top: 18 },
  slideTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  urgentTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.urgent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentTagText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  slideStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slideStatusText: { fontSize: 11, fontWeight: "800" },
  slideBottom: {},
  slideTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  slideRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  slidePay: { color: "#fff", fontSize: 15, fontWeight: "800" },
  slideMeta: { color: "rgba(255,255,255,0.9)", fontSize: 11 },
  dots: { flexDirection: "row", justifyContent: "center", marginTop: spacing.sm },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotActive: { width: 18, backgroundColor: colors.primary },
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  greeting: { fontSize: 12, color: colors.textMuted },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.urgent,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 13, color: colors.textDark },
  statsRow: { flexDirection: "row", paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  statLabel: { fontSize: 9, color: colors.textMuted, fontWeight: "700", marginTop: 2 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  foundText: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  urgentBadge: { fontSize: 12, color: colors.urgent, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
});
