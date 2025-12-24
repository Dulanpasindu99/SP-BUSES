import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, LayoutAnimation } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { COLORS, scale, DIMENSIONS } from "../constants/theme";
import ResultRow from "../components/ResultRow";

export default function RouteResultsScreen({ navigation, route }) {
    const { height: H } = DIMENSIONS;
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
        top: DIMENSIONS.height * 0.34,
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
        top: DIMENSIONS.height * 0.37,
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
});
