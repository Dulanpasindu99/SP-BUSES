import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { COLORS, scale } from "../constants/theme";

export default function SearchRouteScreen({ navigation }) {
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
