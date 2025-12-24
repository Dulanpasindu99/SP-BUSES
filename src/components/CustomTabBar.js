import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, scale } from "../constants/theme";

export default function CustomTabBar({ state, descriptors, navigation }) {
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

const tabStyles = StyleSheet.create({
    wrap: {
        paddingHorizontal: scale(12),
        paddingBottom: scale(10),
        backgroundColor: "transparent",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
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
