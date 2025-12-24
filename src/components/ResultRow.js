import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { COLORS, scale } from "../constants/theme";

export default function ResultRow({ item, expanded, onToggle }) {
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

const resStyles = StyleSheet.create({
    tagPill: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
    tagText: { color: "#fff", fontWeight: "900", fontSize: scale(12) },
    greenDot: { width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: "#22C55E" },
    durationText: { fontWeight: "900", color: "#111", fontSize: scale(14) },
    tripText: { marginTop: scale(10), fontSize: scale(14), color: "#111", fontWeight: "800" },
});
