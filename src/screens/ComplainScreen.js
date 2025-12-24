import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, ScrollView } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { COLORS, scale } from "../constants/theme";
import { ENDPOINTS } from "../constants/api";

export default function ComplainScreen({ navigation }) {
    // Replace with your real backend
    const BUS_SEARCH_URL = `${ENDPOINTS.BUS_SEARCH}?q=`;


    const [busNumber, setBusNumber] = useState("");
    const [complaint, setComplaint] = useState("");

    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [showSuggest, setShowSuggest] = useState(false);

    const [attachments, setAttachments] = useState([]);
    const MAX_TOTAL_BYTES = 120 * 1024 * 1024;



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
        Alert.alert("Coming Soon", "This feature will be available shortly.");
        // API integration temporarily disabled
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



            <View style={cStyles.panel}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={scale(20)}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                    >
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

                            <TouchableOpacity style={[cStyles.submitBtn, { backgroundColor: "#ccc" }]} activeOpacity={1} disabled={true}>
                                <Text style={cStyles.submitText}>Submit Complaint</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

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


    uploadOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 999, alignItems: "center", justifyContent: "center" },
    uploadCard: { width: "86%", backgroundColor: "white", borderRadius: scale(18), padding: scale(16) },
    uploadTitle: { fontWeight: "900", fontSize: scale(16), color: "#111" },
    progressTrack: { marginTop: scale(12), height: scale(10), borderRadius: scale(999), backgroundColor: "#EAEAEA", overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: COLORS.maroon },
    uploadPct: { marginTop: scale(10), fontWeight: "900", color: "#111", textAlign: "right" },
});
