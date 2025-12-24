import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { COLORS, scale } from "../constants/theme";

export default function ResultRow({ item, liveInfo, expanded, onToggle, isHighlighted }) {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!expanded && !liveInfo) return; // Only pulse if expanded OR if it's the live dot (controlled inside)
        // If we want the green dot to pulse when not expanded
        if (item.isOnline) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.35, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [expanded, pulse, item.isOnline]);

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr.length !== 4) return timeStr;
        const hours = parseInt(timeStr.substring(0, 2));
        const minutes = timeStr.substring(2);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'running': return '#4CAF50';
            case 'joined_to_route': return '#2196F3';
            case 'loading_passengers': return '#FF9800';
            case 'completed': return '#9E9E9E';
            case 'not_operated': return '#F44336';
            default: return '#757575';
        }
    };

    // Calculate distance to find nearest stop if live info exists
    const getDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const stops = item.runningSlotBusStops || item.runningSlot?.runningSlotBusStops || [];
    const plate = item.deviceId ? item.deviceId.substring(0, 7) : "---";
    const statusText = item.busTurnStatus ? item.busTurnStatus.replace(/_/g, ' ') : "Pending";
    const statusColor = getStatusColor(item.busTurnStatus);
    const startName = stops[0]?.busStop.name || "Start";
    const startTime = formatTime(stops[0]?.weekdayTime);
    const endName = stops[stops.length - 1]?.busStop.name || "End";
    const endTime = formatTime(stops[stops.length - 1]?.weekdayTime);

    let nearestStopIndex = -1;
    if (liveInfo && liveInfo.lat && liveInfo.lon) {
        let minDist = 9999;
        stops.forEach((s, idx) => {
            const d = getDistance(liveInfo.lat, liveInfo.lon, s.busStop.latitude, s.busStop.longitude);
            if (d < minDist) {
                minDist = d;
                nearestStopIndex = idx;
            }
        });
    }

    return (
        <View style={[{ paddingVertical: scale(14) }, isHighlighted && resStyles.highlightedRow]}>
            <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: scale(10) }}>
                    <MaterialCommunityIcons name="bus" size={scale(20)} color="#111" />

                    <View style={[resStyles.tagPill, { backgroundColor: statusColor }]}>
                        <Text style={resStyles.tagText}>{plate}</Text>
                    </View>

                    <View style={[resStyles.tagPill, { backgroundColor: statusColor, opacity: 0.85 }]}>
                        <Text style={resStyles.tagText}>{statusText}</Text>
                    </View>

                    {isHighlighted && (
                        <View style={resStyles.highlightBadge}>
                            <Text style={resStyles.highlightBadgeText}>NEXT BUS</Text>
                        </View>
                    )}

                    {item.isOnline && <Animated.View style={[resStyles.greenDot, { transform: [{ scale: pulse }] }]} />}

                    <View style={{ flex: 1 }} />
                    <Text style={resStyles.durationText}>{formatTime(item.loadingStartingTime)}</Text>

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
                    <View style={resStyles.timelineContainer}>
                        {stops.map((stop, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === stops.length - 1;
                            const isBusHere = idx === nearestStopIndex;
                            const isPassed = nearestStopIndex > -1 && idx <= nearestStopIndex;

                            return (
                                <View key={idx} style={resStyles.timelineRow}>
                                    {/* Time Column */}
                                    <View style={resStyles.timeCol}>
                                        <Text style={resStyles.timeText}>{formatTime(stop.weekdayTime)}</Text>
                                    </View>

                                    {/* Line & Dot Column */}
                                    <View style={resStyles.lineCol}>
                                        {!isFirst && <View style={[resStyles.line, isPassed ? resStyles.lineActive : null]} />}

                                        <View style={[
                                            resStyles.dot,
                                            isPassed ? resStyles.dotActive : null,
                                            isBusHere ? resStyles.dotBus : null // Special style if bus is here
                                        ]}>
                                            {isBusHere && (
                                                <MaterialCommunityIcons name="bus-side" size={scale(12)} color="#8E44AD" />
                                            )}
                                        </View>

                                        {!isLast && <View style={[resStyles.line, isPassed ? resStyles.lineActive : null]} />}
                                    </View>

                                    {/* Details Column */}
                                    <View style={resStyles.detailsCol}>
                                        <Text style={[resStyles.stopName, isBusHere ? resStyles.stopNameActive : null]}>
                                            {stop.busStop.name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: scale(20) }}>
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#A06ACB",
                                paddingVertical: scale(8),
                                paddingHorizontal: scale(14),
                                borderRadius: scale(999),
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "800", fontSize: scale(13) }}>
                                Arrives to you at
                            </Text>
                            <Text style={{ color: "#fff", fontWeight: "900", fontSize: scale(13), marginLeft: scale(10) }}>
                                {item.arrivesAt || "---"}
                            </Text>
                        </View>

                        <View style={{ flex: 1 }} />
                        <Text style={{ color: "#b20a37", fontWeight: "900", fontSize: scale(13) }}>
                            Delayed {item.delayMin || 0} min
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onToggle}
                        style={{
                            marginTop: scale(10),
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
    highlightedRow: {
        backgroundColor: "#FFF9FA",
        borderRadius: scale(16),
        paddingHorizontal: scale(8),
        marginHorizontal: -scale(8),
        borderWidth: 1,
        borderColor: "#FFE4E9",
    },
    highlightBadge: {
        backgroundColor: "#b20a37",
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: scale(4),
    },
    highlightBadgeText: {
        color: "#fff",
        fontSize: scale(9),
        fontWeight: "900",
    },
    tagPill: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
    tagText: { color: "#fff", fontWeight: "900", fontSize: scale(12) },
    greenDot: { width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: "#22C55E" },
    durationText: { fontWeight: "900", color: "#111", fontSize: scale(14) },
    tripText: { marginTop: scale(10), fontSize: scale(14), color: "#111", fontWeight: "800" },

    // Timeline
    timelineContainer: { marginTop: scale(14) },
    timelineRow: { flexDirection: "row", minHeight: scale(32) },
    timeCol: { width: scale(60), alignItems: "flex-end", paddingRight: scale(10), justifyContent: 'center' },
    timeText: { fontSize: scale(12), fontWeight: "700", color: "#444" },
    lineCol: { width: scale(20), alignItems: "center" },
    line: { width: 2, flex: 1, backgroundColor: "#E0E0E0" },
    lineActive: { backgroundColor: "#8E44AD" },
    dot: { width: scale(10), height: scale(10), borderRadius: scale(5), backgroundColor: "#E0E0E0", marginVertical: 2 },
    dotActive: { backgroundColor: "#8E44AD" },
    dotBus: {
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        backgroundColor: "#FFF",
        borderWidth: 2,
        borderColor: "#8E44AD",
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: "#8E44AD",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4
    },
    detailsCol: { flex: 1, paddingLeft: scale(10), justifyContent: 'center' },
    stopName: { fontSize: scale(13), color: "#111" },
    stopNameActive: { fontWeight: "bold", color: "#8E44AD" },
});
