import "react-native-gesture-handler";
import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  Keyboard,
  Animated,
  LayoutAnimation,
  UIManager,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Feather, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";

const { width: W, height: H } = Dimensions.get("window");
const guidelineBaseWidth = 375;
const scale = (size) => (W / guidelineBaseWidth) * size;

const COLORS = {
  maroon: "#8B0F2A",
  lightPink: "#F4E1E5",
  lightPink2: "#F7E8EB",
  white: "#FFFFFF",
  text: "#222222",
  muted: "#8A8A8A",
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Tabs have the bottom nav */}
        <Stack.Screen name="Tabs" component={Tabs} />
        {/* Results screen is outside tabs => NO bottom nav */}
        <Stack.Screen name="RouteResults" component={RouteResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="SearchRoute" component={SearchRouteScreen} options={{ title: "Search Route" }} />
      <Tab.Screen name="Complain" component={ComplainScreen} />
    </Tab.Navigator>
  );
}

/** Custom bottom nav to match your UI */
function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={tabStyles.wrap}>
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => navigation.navigate(route.name);

          const icon =
            route.name === "Home" ? "home" : route.name === "SearchRoute" ? "shuffle" : "calendar";

          const label = options.title ?? route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.9}
              style={[tabStyles.item, isFocused && tabStyles.itemActive]}
            >
              <Feather name={icon} size={scale(18)} color="#222" />
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------- HOME -------------------------------- */
function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 6.84,
          longitude: 80.003,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      />

      {/* Top search */}
      <View style={homeStyles.topArea}>
        <View style={homeStyles.searchBar}>
          <View style={homeStyles.spBadge}>
            <Text style={homeStyles.spBadgeText}>SP</Text>
          </View>

          <TextInput
            placeholder="Search Bus   Eg:370"
            placeholderTextColor="#9B9B9B"
            style={homeStyles.searchInput}
          />

          <TouchableOpacity style={homeStyles.iconBtn}>
            <MaterialIcons name="keyboard-voice" size={scale(22)} color={COLORS.maroon} />
          </TouchableOpacity>

          <TouchableOpacity style={homeStyles.maroonCircle}>
            <Feather name="droplet" size={scale(18)} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={homeStyles.chipsRow}>
          <BusChip label="370" />
          <BusChip label="515" />
          <BusChip label="335/10" />
          <BusChip label="353/6" />
        </View>
      </View>

      {/* Right floating buttons */}
      <View style={homeStyles.floatingRight}>
        <TouchableOpacity style={homeStyles.fabWhite}>
          <MaterialIcons name="navigation" size={scale(20)} color={COLORS.maroon} />
        </TouchableOpacity>

        <TouchableOpacity style={homeStyles.fabBus}>
          <MaterialCommunityIcons name="bus" size={scale(20)} color={COLORS.white} />
          <Text style={homeStyles.fabBusText}>100</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom route panel above tab bar */}
      <View style={homeStyles.bottomPanelWrap}>
        <View style={homeStyles.bottomPanel}>
          <View style={homeStyles.routeRow}>
            <TouchableOpacity style={homeStyles.backBtn}>
              <Ionicons name="chevron-back" size={scale(22)} color={COLORS.text} />
            </TouchableOpacity>

            <View style={homeStyles.inputsCol}>
              <View style={homeStyles.routeInput}>
                <View style={homeStyles.dotBlue} />
                <Text style={homeStyles.routeText}>Your location</Text>
              </View>

              <View style={homeStyles.midDots}>
                <MaterialIcons name="more-vert" size={scale(18)} color="#777" />
              </View>

              <TouchableOpacity
                style={homeStyles.routeInput}
                onPress={() => navigation.navigate("SearchRoute")}
              >
                <MaterialIcons name="location-on" size={scale(18)} color="#C62828" />
                <Text style={homeStyles.routeTextMuted}>Choose destination</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={scale(16)} color="#777" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={homeStyles.swapBtn}>
              <MaterialCommunityIcons name="swap-vertical" size={scale(22)} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>
              The Launching ceremony will be held on 05th January 2026
            </Text>
            <Text style={styles.noticeSub}>NOTICE BY SPRPTA</Text>
          </View>

          <Text style={styles.footerText}>
            Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BusChip({ label }) {
  return (
    <TouchableOpacity style={homeStyles.chip}>
      <MaterialCommunityIcons name="bus" size={scale(18)} color={COLORS.text} />
      <Text style={homeStyles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------ SEARCH ROUTE ------------------------------ */
function SearchRouteScreen({ navigation }) {
  const onGoResults = () => {
    navigation.navigate("RouteResults", {
      routeNo: "370",
      from: "Galle Central Bus Stand",
      to: "Baddegama",
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 6.06,
          longitude: 80.22,
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        }}
      />

      <View style={srStyles.panel}>
        <View style={srStyles.handlePill} />

        <View style={srStyles.routeTopRow}>
          <TouchableOpacity style={srStyles.backBtn} onPress={() => navigation.navigate("Home")}>
            <Ionicons name="chevron-back" size={scale(22)} color={COLORS.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <View style={srStyles.routeInput}>
              <View style={srStyles.dotBlue} />
              <Text style={srStyles.routeText}>Your location</Text>
            </View>

            <View style={srStyles.midDots}>
              <MaterialIcons name="more-vert" size={scale(18)} color="#777" />
            </View>

            <TouchableOpacity style={srStyles.routeInput} onPress={onGoResults}>
              <MaterialIcons name="location-on" size={scale(18)} color="#C62828" />
              <Text style={srStyles.routeTextMuted}>Choose destination</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={scale(16)} color="#777" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={srStyles.swapBtn}>
            <MaterialCommunityIcons name="swap-vertical" size={scale(22)} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            The Launching ceremony will be held on 05th January 2026
          </Text>
          <Text style={styles.noticeSub}>NOTICE FROM SPRPTA</Text>
        </View>

        <Text style={styles.footerText}>
          Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------ ROUTE RESULTS ------------------------------ */
function RouteResultsScreen({ navigation, route }) {
  const { routeNo = "370", from = "Galle Central Bus Stand", to = "Baddegama" } = route?.params || {};

  // Mock routes
  const mainRoute = [
    { latitude: 6.053, longitude: 80.221 },
    { latitude: 6.12, longitude: 80.27 },
    { latitude: 6.18, longitude: 80.305 },
    { latitude: 6.22, longitude: 80.33 },
  ];

  const altRoute1 = [
    { latitude: 6.05, longitude: 80.2 },
    { latitude: 6.11, longitude: 80.235 },
    { latitude: 6.17, longitude: 80.27 },
    { latitude: 6.22, longitude: 80.3 },
  ];

  const altRoute2 = [
    { latitude: 6.055, longitude: 80.205 },
    { latitude: 6.115, longitude: 80.245 },
    { latitude: 6.165, longitude: 80.285 },
    { latitude: 6.215, longitude: 80.315 },
  ];

  const labels = [
    { id: "alt", text: "58 min", coord: altRoute1[1] },
    { id: "main", text: "1 hr 31 min", coord: mainRoute[2] },
  ];

  // Animated bus (mock)
  const [busIndex, setBusIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBusIndex((p) => (p + 1) % mainRoute.length), 1200);
    return () => clearInterval(t);
  }, []);
  const busCoord = mainRoute[busIndex];

  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => ["28%", "58%", "86%"], []);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const results = [
    {
      id: "1",
      plate: "ND-0671",
      status: "Running",
      start: "Galle 1:00 PM",
      end: "Baddegama 1:50 PM",
      duration: "0hr 50 min",
      tagColor: "#1E88E5",
      arrivesAt: "11:31",
      delayMin: 21,
      stops: [
        { time: "1:00 PM", name: "Galle" },
        { time: "1:30 PM", name: "Poddala" },
        { time: "1:50 PM", name: "Baddegama" },
      ],
    },
    {
      id: "2",
      plate: "Not Identified",
      status: "Running",
      start: "Galle 1:10 PM",
      end: "Baddegama 2:00 PM",
      duration: "0hr 50 min",
      tagColor: "#7E57C2",
      arrivesAt: "11:34",
      delayMin: 12,
      stops: [
        { time: "1:10 PM", name: "Galle" },
        { time: "1:40 PM", name: "Poddala" },
        { time: "2:00 PM", name: "Baddegama" },
      ],
    },
    {
      id: "3",
      plate: "ND-0672",
      status: "Running",
      start: "Galle 1:20 PM",
      end: "Baddegama 2:10 PM",
      duration: "0hr 50 min",
      tagColor: "#1E88E5",
      arrivesAt: "11:38",
      delayMin: 6,
      stops: [
        { time: "1:20 PM", name: "Galle" },
        { time: "1:50 PM", name: "Poddala" },
        { time: "2:10 PM", name: "Baddegama" },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 6.14,
          longitude: 80.29,
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        }}
      >
        <Polyline coordinates={altRoute1} strokeWidth={5} strokeColor="#6B6B6B" />
        <Polyline coordinates={altRoute2} strokeWidth={5} strokeColor="#8A8A8A" />
        <Polyline coordinates={mainRoute} strokeWidth={6} strokeColor="#6A3DBB" />

        <Marker coordinate={mainRoute[0]} />
        <Marker coordinate={mainRoute[mainRoute.length - 1]} />

        {labels.map((l) => (
          <Marker key={l.id} coordinate={l.coord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={resStyles.durationBubble}>
              <Text style={resStyles.durationBubbleText}>{l.text}</Text>
            </View>
          </Marker>
        ))}

        <Marker coordinate={busCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={resStyles.busDot} />
        </Marker>
      </MapView>

      {/* Top from/to bar */}
      <View style={resStyles.resultsTopBar}>
        <View style={resStyles.resultsRow}>
          <View style={resStyles.circleIcon} />
          <Text style={resStyles.resultsText}>{from}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <MaterialIcons name="more-vert" size={scale(20)} color="#222" />
          </TouchableOpacity>
        </View>
        <View style={resStyles.divider} />
        <View style={resStyles.resultsRow}>
          <MaterialIcons name="location-on" size={scale(18)} color="#C62828" />
          <Text style={resStyles.resultsText}>{to}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <MaterialCommunityIcons name="swap-vertical" size={scale(22)} color="#222" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating left route chip */}
      <View style={resStyles.leftRouteChip}>
        <MaterialCommunityIcons name="bus" size={scale(22)} color={COLORS.white} />
        <View>
          <Text style={resStyles.leftRouteNo}>{routeNo}</Text>
          <Text style={resStyles.leftRouteLabel}>ROUTE</Text>
        </View>
      </View>

      {/* Right dot */}
      <TouchableOpacity style={resStyles.rightRedDot}>
        <View style={resStyles.redDot} />
      </TouchableOpacity>

      {/* Bottom draggable sheet */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={1}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: "rgba(255,255,255,0.98)" }}
        handleIndicatorStyle={{ width: scale(60) }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: scale(14) }}>
          <View style={resStyles.sheetHeader}>
            <View style={resStyles.logoRow}>
              <View style={resStyles.spBadgeSmall}>
                <Text style={resStyles.spBadgeSmallText}>SP</Text>
              </View>
              <Text style={resStyles.rptaText}>RPTA</Text>
            </View>

            <Text style={resStyles.currentText}>Current: 1:45 PM</Text>

            <View style={resStyles.headerActions}>
              <TouchableOpacity style={resStyles.circleBtn}>
                <Feather name="share-2" size={scale(18)} color="#222" />
              </TouchableOpacity>
              <TouchableOpacity style={resStyles.circleBtn} onPress={onClose}>
                <Feather name="x" size={scale(18)} color="#222" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={results}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={resStyles.listSep} />}
            renderItem={({ item }) => (
              <ResultRow
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => toggleExpand(item.id)}
              />
            )}
            ListFooterComponent={
              <>
                <View style={{ height: scale(12) }} />
                <View style={styles.noticeBanner}>
                  <Text style={styles.noticeText}>
                    The Launching ceremony will be held on 05th January 2026
                  </Text>
                  <Text style={styles.noticeSub}>NOTICE FROM SPRPTA</Text>
                </View>
                <Text style={styles.footerText}>
                  Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
                </Text>
                <View style={{ height: scale(22) }} />
              </>
            }
          />
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** Expandable item like your screenshot */
function ResultRow({ item, expanded, onToggle }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!expanded) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [expanded, pulse]);

  const stops = item.stops || [];

  return (
    <View style={{ paddingVertical: scale(14) }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: scale(10) }}>
          <MaterialCommunityIcons name="bus" size={scale(20)} color="#111" />

          <View style={[resStyles.tagPill, { backgroundColor: item.tagColor }]}>
            <Text style={resStyles.tagText}>{item.plate}</Text>
          </View>

          <View style={[resStyles.tagPill, { backgroundColor: item.tagColor, opacity: 0.85 }]}>
            <Text style={resStyles.tagText}>{item.status}</Text>
          </View>

          <Animated.View style={[resStyles.greenDot, { transform: [{ scale: expanded ? pulse : 1 }] }]} />

          <View style={{ flex: 1 }} />
          <Text style={resStyles.durationText}>{item.duration}</Text>

          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={scale(18)} color="#111" />
        </View>

        {!expanded && (
          <Text style={resStyles.tripText}>
            {item.start}  -  {item.end}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: scale(14) }}>
          <Text style={[resStyles.tripText, { marginTop: 0 }]}>
            <Text style={{ fontWeight: "900" }}>From </Text>
            {item.start}
            <Text style={{ fontWeight: "900" }}>  To </Text>
            {item.end}
          </Text>

          <View style={{ flexDirection: "row", marginTop: scale(14), gap: scale(14) }}>
            <View style={{ width: scale(26), alignItems: "center" }}>
              <MaterialCommunityIcons name="bus" size={scale(18)} color="#111" />
              <View
                style={{
                  width: scale(8),
                  flex: 1,
                  borderRadius: scale(999),
                  backgroundColor: "#8E44AD",
                  marginTop: scale(8),
                  marginBottom: scale(8),
                }}
              />
              <View
                style={{
                  width: scale(14),
                  height: scale(14),
                  borderRadius: scale(7),
                  backgroundColor: "#fff",
                  borderWidth: 3,
                  borderColor: "#8E44AD",
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              {stops.map((s, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: scale(10) }}>
                  <Text style={{ width: scale(70), fontWeight: "900", color: "#111", fontSize: scale(14) }}>
                    {s.time}
                  </Text>
                  <Text style={{ fontWeight: "700", color: "#111", fontSize: scale(14) }}> - {s.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: scale(10) }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#A06ACB",
                paddingVertical: scale(10),
                paddingHorizontal: scale(14),
                borderRadius: scale(999),
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: scale(13) }}>
                Arrives to you at
              </Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: scale(13), marginLeft: scale(10) }}>
                {item.arrivesAt}
              </Text>
            </View>

            <View style={{ flex: 1 }} />
            <Text style={{ color: "#C62828", fontWeight: "900", fontSize: scale(13) }}>
              Delayed {item.delayMin} min
            </Text>
          </View>

          <TouchableOpacity
            onPress={onToggle}
            style={{
              marginTop: scale(14),
              alignSelf: "flex-end",
              paddingVertical: scale(8),
              paddingHorizontal: scale(12),
              borderRadius: scale(10),
              backgroundColor: "#F2F2F2",
            }}
          >
            <Text style={{ fontWeight: "900", color: "#111" }}>Minimize</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* -------------------------------- COMPLAIN -------------------------------- */
function ComplainScreen({ navigation }) {
  // Replace with your real backend
  const BUS_SEARCH_URL = "https://YOUR_BACKEND_DOMAIN/api/buses/search?q=";
  const COMPLAINT_UPLOAD_URL = "https://YOUR_BACKEND_DOMAIN/api/complaints";

  const [busNumber, setBusNumber] = useState("");
  const [complaint, setComplaint] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const MAX_TOTAL_BYTES = 120 * 1024 * 1024;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const bytesToMB = (b) => (b / (1024 * 1024)).toFixed(2);
  const getTotalSize = (list) => list.reduce((sum, f) => sum + (f.size || 0), 0);

  const guessMimeFromName = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".m4v")) return "video/x-m4v";
    if (lower.endsWith(".avi")) return "video/x-msvideo";
    return "application/octet-stream";
  };

  const isAllowed = ({ name, mimeType }) => {
    const lower = (name || "").toLowerCase();
    const mt = mimeType || guessMimeFromName(name);
    const isImg = mt.startsWith("image/") || [".jpg", ".jpeg", ".png"].some((x) => lower.endsWith(x));
    const isPdf = mt === "application/pdf" || lower.endsWith(".pdf");
    const isVideo = mt.startsWith("video/") || [".mp4", ".mov", ".m4v", ".avi"].some((x) => lower.endsWith(x));
    return isImg || isPdf || isVideo;
  };

  const addFiles = async (assets) => {
    let current = [...attachments];
    let total = getTotalSize(current);

    for (const a of assets) {
      const uri = a.uri;
      const name = a.name || uri?.split("/").pop() || "file";
      const mimeType = a.mimeType || guessMimeFromName(name);

      let size = a.size;
      if (!size && uri) {
        const info = await FileSystem.getInfoAsync(uri);
        size = info?.size || 0;
      }

      const candidate = { uri, name, mimeType, size };

      if (!isAllowed(candidate)) {
        Alert.alert("Unsupported file", "Allowed: JPG/PNG, PDF, Video.");
        continue;
      }

      if (total + size > MAX_TOTAL_BYTES) {
        Alert.alert(
          "Attachment size limit",
          `Total attachments must be 120 MB or less.\nCurrent: ${bytesToMB(total)} MB\nThis file: ${bytesToMB(size)} MB`
        );
        continue;
      }

      if (current.some((f) => f.uri === uri)) continue;
      current.push(candidate);
      total += size;
    }

    setAttachments(current);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access to attach images/videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) return;

    const assets = (result.assets || []).map((x) => ({
      uri: x.uri,
      name: x.fileName || x.uri?.split("/").pop(),
      mimeType: x.mimeType || guessMimeFromName(x.fileName || x.uri?.split("/").pop()),
      size: x.fileSize,
    }));

    await addFiles(assets);
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ["image/*", "application/pdf", "video/*"],
    });

    if (result.canceled) return;

    const assets = (result.assets || []).map((x) => ({
      uri: x.uri,
      name: x.name,
      mimeType: x.mimeType || guessMimeFromName(x.name),
      size: x.size,
    }));

    await addFiles(assets);
  };

  const openPicker = () => {
    Alert.alert("Add attachment", "Choose source", [
      { text: "Photo / Video", onPress: pickFromGallery },
      { text: "Browse Files (PDF)", onPress: pickFromFiles },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeAttachment = (uri) => setAttachments((prev) => prev.filter((f) => f.uri !== uri));

  // Suggestions (debounced + fallback)
  useEffect(() => {
    const q = busNumber.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }

    setLoadingSuggest(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(BUS_SEARCH_URL + encodeURIComponent(q));
        const data = await res.json();

        let items = [];
        if (Array.isArray(data)) {
          items = data.map((x) =>
            typeof x === "string"
              ? { key: x, label: x, value: x }
              : { key: x.busNumber || x.label, label: x.label || x.busNumber, value: x.busNumber || x.label }
          );
        }

        setSuggestions(items.slice(0, 8));
        setShowSuggest(true);
      } catch {
        // fallback mock
        const mock = ["ND-0671", "ND-0672", "NA-1234", "NC-7788"]
          .filter((x) => x.toLowerCase().includes(q.toLowerCase()))
          .map((x) => ({ key: x, label: x, value: x }));
        setSuggestions(mock);
        setShowSuggest(true);
      } finally {
        setLoadingSuggest(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [busNumber]);

  const selectSuggestion = (value) => {
    setBusNumber(value);
    setShowSuggest(false);
    Keyboard.dismiss();
  };

  const onSubmit = () => {
    const bn = busNumber.trim();
    const cp = complaint.trim();
    if (!bn) return Alert.alert("Missing bus number", "Please enter the bus number.");
    if (!cp) return Alert.alert("Missing complaint", "Please write your complaint.");

    const total = getTotalSize(attachments);
    if (total > MAX_TOTAL_BYTES) return Alert.alert("Size limit", "Total attachments must be 120 MB or less.");

    const form = new FormData();
    form.append("busNumber", bn);
    form.append("complaint", cp);

    attachments.forEach((f, idx) => {
      form.append("attachments", {
        uri: f.uri,
        name: f.name || `file_${idx}`,
        type: f.mimeType || guessMimeFromName(f.name),
      });
    });

    setIsUploading(true);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", COMPLAINT_UPLOAD_URL);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      setUploadProgress(Math.min(1, Math.max(0, e.loaded / e.total)));
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        Alert.alert("Success", "Complaint submitted successfully.");
        setBusNumber("");
        setComplaint("");
        setAttachments([]);
      } else {
        Alert.alert("Upload failed", `Server responded with ${xhr.status}.`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      Alert.alert("Upload failed", "Network error. Please try again.");
    };

    xhr.send(form);
  };

  const totalBytes = getTotalSize(attachments);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 6.92,
          longitude: 79.86,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
      />

      {isUploading && (
        <View style={cStyles.uploadOverlay}>
          <View style={cStyles.uploadCard}>
            <Text style={cStyles.uploadTitle}>Uploading...</Text>
            <View style={cStyles.progressTrack}>
              <View style={[cStyles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
            </View>
            <Text style={cStyles.uploadPct}>{Math.round(uploadProgress * 100)}%</Text>
            <ActivityIndicator style={{ marginTop: scale(10) }} />
          </View>
        </View>
      )}

      <View style={cStyles.panel}>
        <View style={cStyles.handlePill} />

        {/* X -> Home */}
        <TouchableOpacity style={cStyles.closeBtn} onPress={() => navigation.navigate("Home")}>
          <Feather name="x" size={scale(18)} color="#111" />
        </TouchableOpacity>

        <View style={cStyles.header}>
          <View style={cStyles.brandRow}>
            <View style={cStyles.spBadge}>
              <Text style={cStyles.spBadgeText}>SP</Text>
            </View>
            <Text style={cStyles.brandText}>RPTA</Text>
          </View>

          <Text style={cStyles.title}>ADD A COMPLAINT</Text>
          <Text style={cStyles.subtitle}>
            Add your complaints about the buses{"\n"}
            operated by Southern Provincial{"\n"}
            Road Passenger Transport Authority
          </Text>
        </View>

        <View style={{ marginTop: scale(10) }}>
          <Text style={cStyles.label}>Bus Number</Text>

          <View style={cStyles.inputWrap}>
            <TextInput
              value={busNumber}
              onChangeText={(t) => {
                setBusNumber(t);
                setShowSuggest(true);
              }}
              placeholder="Type bus number to search"
              placeholderTextColor="#9B9B9B"
              style={cStyles.input}
              onFocus={() => busNumber.trim().length >= 2 && setShowSuggest(true)}
            />
            {loadingSuggest && <ActivityIndicator style={{ position: "absolute", right: scale(12) }} />}
          </View>

          {showSuggest && suggestions.length > 0 && (
            <View style={cStyles.suggestBox}>
              {suggestions.map((s) => (
                <TouchableOpacity key={s.key} style={cStyles.suggestItem} onPress={() => selectSuggestion(s.value)}>
                  <Text style={cStyles.suggestText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={cStyles.infoBox}>
            <View style={cStyles.infoIcon}>
              <Feather name="info" size={scale(18)} color="#111" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cStyles.infoTitle}>Heads up!</Text>
              <Text style={cStyles.infoText}>
                Write a descriptive complaint including all{"\n"}relevant details.
              </Text>
            </View>
          </View>

          <Text style={[cStyles.label, { marginTop: scale(14) }]}>Complaint</Text>
          <View style={[cStyles.inputWrap, { height: scale(86), borderRadius: scale(14) }]}>
            <TextInput
              value={complaint}
              onChangeText={setComplaint}
              placeholder="Write your complaint here"
              placeholderTextColor="#9B9B9B"
              style={[cStyles.input, { height: "100%", textAlignVertical: "top" }]}
              multiline
            />
          </View>

          <Text style={[cStyles.label, { marginTop: scale(14) }]}>
            Attachments (JPG/PNG/PDF/Video, total ≤ 120 MB)
          </Text>

          <TouchableOpacity style={cStyles.fileRow} onPress={openPicker} activeOpacity={0.9}>
            <View style={cStyles.fileBtn}>
              <Text style={cStyles.fileBtnText}>Choose Files</Text>
            </View>

            <Text style={cStyles.fileName}>
              {attachments.length === 0 ? "no files selected" : `${attachments.length} file(s) selected`}
            </Text>

            <View style={{ flex: 1 }} />
            <Text style={cStyles.sizeText}>{bytesToMB(totalBytes)} MB</Text>
          </TouchableOpacity>

          {attachments.length > 0 && (
            <View style={{ marginTop: scale(10) }}>
              {attachments.slice(0, 4).map((f) => (
                <View key={f.uri} style={cStyles.fileItem}>
                  <Text style={cStyles.fileItemText} numberOfLines={1}>
                    {f.name} • {bytesToMB(f.size || 0)} MB
                  </Text>
                  <TouchableOpacity onPress={() => removeAttachment(f.uri)}>
                    <Feather name="x" size={scale(16)} color="#111" />
                  </TouchableOpacity>
                </View>
              ))}
              {attachments.length > 4 && <Text style={cStyles.moreText}>+ {attachments.length - 4} more</Text>}
            </View>
          )}

          <Text style={cStyles.helperText}>Total attachments must be 120 MB or less.</Text>

          <TouchableOpacity style={cStyles.submitBtn} onPress={onSubmit} activeOpacity={0.92} disabled={isUploading}>
            <Text style={cStyles.submitText}>Submit Complaint</Text>
          </TouchableOpacity>

          <Text style={cStyles.termsText}>
            By clicking continue, you agree to our{" "}
            <Text style={cStyles.linkText} onPress={() => Linking.openURL("https://YOUR_DOMAIN/terms")}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={cStyles.linkText} onPress={() => Linking.openURL("https://YOUR_DOMAIN/privacy")}>
              Privacy Policy
            </Text>
            . Developed by <Text style={cStyles.linkText}>Aldtan</Text>.
          </Text>

          <View style={[styles.noticeBanner, { marginTop: scale(12) }]}>
            <Text style={styles.noticeText}>
              The Launching ceremony will be held on 05th January 2026
            </Text>
            <Text style={styles.noticeSub}>NOTICE FROM SPRPTA</Text>
          </View>

          <Text style={styles.footerText}>
            Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------ SHARED STYLES ------------------------------ */
const styles = StyleSheet.create({
  noticeBanner: {
    marginTop: scale(12),
    backgroundColor: COLORS.lightPink2,
    borderRadius: scale(16),
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    alignItems: "center",
  },
  noticeText: {
    textAlign: "center",
    fontSize: scale(13),
    color: "#444",
    fontWeight: "600",
    lineHeight: scale(18),
  },
  noticeSub: {
    marginTop: scale(6),
    fontSize: scale(10),
    color: "#555",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  footerText: {
    marginTop: scale(10),
    textAlign: "center",
    fontSize: scale(10.5),
    color: "#666",
    fontWeight: "600",
  },
});

const tabStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: scale(12),
    paddingBottom: scale(10),
    backgroundColor: "transparent",
  },
  bar: {
    backgroundColor: COLORS.lightPink,
    borderRadius: scale(22),
    padding: scale(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(10),
    borderRadius: scale(18),
    gap: scale(6),
  },
  itemActive: {
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  label: { fontSize: scale(12), color: "#333", fontWeight: "800" },
  labelActive: { color: "#111" },
});

const homeStyles = StyleSheet.create({
  topArea: { position: "absolute", top: scale(10), left: scale(12), right: scale(12) },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: scale(14),
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  spBadge: {
    width: scale(36),
    height: scale(28),
    borderRadius: scale(6),
    backgroundColor: COLORS.maroon,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
  },
  spBadgeText: { color: "#fff", fontWeight: "900", fontSize: scale(14) },
  searchInput: { flex: 1, fontSize: scale(15), color: "#222", paddingVertical: 0, fontWeight: "600" },
  iconBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(8),
  },
  maroonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.maroon,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: { flexDirection: "row", gap: scale(10), marginTop: scale(10) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: scale(999),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    gap: scale(8),
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: { fontSize: scale(14), color: "#222", fontWeight: "700" },

  floatingRight: {
    position: "absolute",
    right: scale(14),
    top: H * 0.48,
    gap: scale(14),
    alignItems: "center",
  },
  fabWhite: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  fabBus: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(18),
    backgroundColor: COLORS.maroon,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  fabBusText: { marginTop: scale(2), color: "#fff", fontWeight: "900", fontSize: scale(13) },

  bottomPanelWrap: { position: "absolute", left: scale(12), right: scale(12), bottom: scale(95) },
  bottomPanel: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: scale(22),
    padding: scale(14),
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  backBtn: { width: scale(34), height: scale(34), borderRadius: scale(17), alignItems: "center", justifyContent: "center" },
  inputsCol: { flex: 1, gap: scale(10) },
  routeInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: scale(999),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    gap: scale(10),
  },
  dotBlue: { width: scale(10), height: scale(10), borderRadius: scale(5), backgroundColor: "#1E6FFB" },
  routeText: { fontSize: scale(14), color: "#222", fontWeight: "700" },
  routeTextMuted: { fontSize: scale(14), color: COLORS.muted, fontWeight: "700" },
  midDots: { marginLeft: scale(12), marginTop: -scale(6) },
  swapBtn: { width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: "center", justifyContent: "center" },
});

const srStyles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: scale(14),
    left: scale(12),
    right: scale(12),
    bottom: scale(95),
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: scale(26),
    padding: scale(14),
  },
  handlePill: { alignSelf: "center", width: scale(70), height: scale(6), borderRadius: scale(999), backgroundColor: "#CFCFCF", marginBottom: scale(12) },
  routeTopRow: { flexDirection: "row", alignItems: "flex-start", gap: scale(10) },
  backBtn: { width: scale(34), height: scale(34), borderRadius: scale(17), alignItems: "center", justifyContent: "center" },
  routeInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: scale(999),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    gap: scale(10),
  },
  dotBlue: { width: scale(10), height: scale(10), borderRadius: scale(5), backgroundColor: "#1E6FFB" },
  routeText: { fontSize: scale(15), color: "#222", fontWeight: "700" },
  routeTextMuted: { fontSize: scale(15), color: COLORS.muted, fontWeight: "700" },
  midDots: { marginLeft: scale(12), marginTop: -scale(2), marginBottom: scale(6) },
  swapBtn: { width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: "center", justifyContent: "center", marginTop: scale(8) },
});

const resStyles = StyleSheet.create({
  resultsTopBar: {
    position: "absolute",
    top: scale(10),
    left: scale(12),
    right: scale(12),
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: scale(14),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  resultsRow: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  circleIcon: { width: scale(14), height: scale(14), borderRadius: scale(7), borderWidth: 2, borderColor: "#222" },
  resultsText: { fontSize: scale(15), fontWeight: "700", color: "#222" },
  divider: { height: 1, backgroundColor: "#E6E6E6", marginVertical: scale(10) },

  leftRouteChip: {
    position: "absolute",
    left: scale(14),
    top: H * 0.34,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: COLORS.maroon,
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  leftRouteNo: { color: "#fff", fontWeight: "900", fontSize: scale(16), lineHeight: scale(16) },
  leftRouteLabel: { color: "#fff", fontWeight: "800", fontSize: scale(10), opacity: 0.9 },

  rightRedDot: {
    position: "absolute",
    right: scale(18),
    top: H * 0.37,
    width: scale(54),
    height: scale(54),
    borderRadius: scale(18),
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  redDot: { width: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: COLORS.maroon },

  busDot: { width: scale(14), height: scale(14), borderRadius: scale(7), backgroundColor: "#2E7D32", borderWidth: 3, borderColor: "#fff" },

  durationBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  durationBubbleText: { fontWeight: "900", color: "#111", fontSize: scale(13) },

  sheetHeader: { flexDirection: "row", alignItems: "center", paddingVertical: scale(8) },
  logoRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  spBadgeSmall: { width: scale(30), height: scale(22), borderRadius: scale(6), backgroundColor: COLORS.maroon, alignItems: "center", justifyContent: "center" },
  spBadgeSmallText: { color: "#fff", fontWeight: "900", fontSize: scale(12) },
  rptaText: { fontSize: scale(18), fontWeight: "900", color: "#111" },
  currentText: { marginLeft: scale(16), color: "#555", fontWeight: "800" },
  headerActions: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: scale(10) },
  circleBtn: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: "#F2F2F2", alignItems: "center", justifyContent: "center" },

  listSep: { height: 1, backgroundColor: "#EAEAEA" },

  tagPill: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
  tagText: { color: "#fff", fontWeight: "900", fontSize: scale(12) },
  greenDot: { width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: "#22C55E" },
  durationText: { fontWeight: "900", color: "#111", fontSize: scale(14) },
  tripText: { marginTop: scale(10), fontSize: scale(14), color: "#111", fontWeight: "800" },
});

const cStyles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: scale(14),
    left: scale(12),
    right: scale(12),
    bottom: scale(95),
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: scale(26),
    padding: scale(16),
  },
  handlePill: { alignSelf: "center", width: scale(70), height: scale(6), borderRadius: scale(999), backgroundColor: "#CFCFCF", marginBottom: scale(10) },
  closeBtn: {
    position: "absolute",
    top: scale(18),
    right: scale(18),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  header: { alignItems: "center", marginTop: scale(10) },
  brandRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  spBadge: { width: scale(36), height: scale(26), borderRadius: scale(6), backgroundColor: COLORS.maroon, alignItems: "center", justifyContent: "center" },
  spBadgeText: { color: "#fff", fontWeight: "900", fontSize: scale(13) },
  brandText: { fontSize: scale(22), fontWeight: "900", color: "#111" },

  title: { marginTop: scale(14), fontSize: scale(22), fontWeight: "900", color: "#111" },
  subtitle: { marginTop: scale(8), textAlign: "center", fontSize: scale(14), color: "#777", fontWeight: "800", lineHeight: scale(20) },

  label: { fontSize: scale(14), fontWeight: "900", color: "#111", marginBottom: scale(8) },
  inputWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: scale(12),
    height: scale(48),
    justifyContent: "center",
  },
  input: { fontSize: scale(14), fontWeight: "800", color: "#111" },

  suggestBox: { marginTop: scale(6), borderWidth: 1, borderColor: "#E6E6E6", borderRadius: scale(12), overflow: "hidden", backgroundColor: "#fff" },
  suggestItem: { paddingVertical: scale(12), paddingHorizontal: scale(12), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  suggestText: { fontWeight: "900", color: "#111", fontSize: scale(13.5) },

  infoBox: { marginTop: scale(14), backgroundColor: "#F7F7F7", borderRadius: scale(14), padding: scale(14), flexDirection: "row", gap: scale(12), borderWidth: 1, borderColor: "#EAEAEA" },
  infoIcon: { width: scale(34), height: scale(34), borderRadius: scale(17), backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6E6E6", alignItems: "center", justifyContent: "center" },
  infoTitle: { fontWeight: "900", fontSize: scale(14), color: "#111" },
  infoText: { marginTop: scale(4), color: "#666", fontWeight: "800", lineHeight: scale(18) },

  fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E6E6E6", borderRadius: scale(12), height: scale(48), overflow: "hidden", backgroundColor: "#fff" },
  fileBtn: { height: "100%", paddingHorizontal: scale(14), alignItems: "center", justifyContent: "center", backgroundColor: "#F2F2F2", borderRightWidth: 1, borderRightColor: "#E6E6E6" },
  fileBtnText: { fontWeight: "900", color: "#111", fontSize: scale(13) },
  fileName: { paddingHorizontal: scale(12), color: "#111", fontWeight: "800" },
  sizeText: { marginRight: scale(12), fontWeight: "900", color: "#111", fontSize: scale(12) },
  fileItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F7F7F7", borderRadius: scale(10), paddingVertical: scale(10), paddingHorizontal: scale(12), marginBottom: scale(8), borderWidth: 1, borderColor: "#EAEAEA" },
  fileItemText: { flex: 1, marginRight: scale(10), fontWeight: "900", color: "#111", fontSize: scale(12.5) },
  moreText: { marginTop: scale(2), color: "#666", fontWeight: "900", fontSize: scale(12) },

  helperText: { marginTop: scale(8), color: "#777", fontWeight: "800", fontSize: scale(12) },

  submitBtn: { marginTop: scale(16), backgroundColor: COLORS.maroon, borderRadius: scale(999), height: scale(54), alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  submitText: { color: "#fff", fontWeight: "900", fontSize: scale(18) },

  termsText: { marginTop: scale(10), textAlign: "center", color: "#666", fontWeight: "800", fontSize: scale(11.5), lineHeight: scale(16) },
  linkText: { textDecorationLine: "underline", color: "#444", fontWeight: "900" },

  uploadOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 999, alignItems: "center", justifyContent: "center" },
  uploadCard: { width: "86%", backgroundColor: "white", borderRadius: scale(18), padding: scale(16) },
  uploadTitle: { fontWeight: "900", fontSize: scale(16), color: "#111" },
  progressTrack: { marginTop: scale(12), height: scale(10), borderRadius: scale(999), backgroundColor: "#EAEAEA", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.maroon },
  uploadPct: { marginTop: scale(10), fontWeight: "900", color: "#111", textAlign: "right" },
});
