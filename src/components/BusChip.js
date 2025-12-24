import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, scale } from "../constants/theme";

export default function BusChip({ label }) {
    return (
        <TouchableOpacity style={styles.chip}>
            <MaterialCommunityIcons name="bus" size={scale(18)} color={COLORS.text} />
            <Text style={styles.chipText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
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
});
