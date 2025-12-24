import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TextInput,
    TouchableOpacity,
    Platform,
    StatusBar,
    Animated,
    PanResponder,
    ScrollView,
    Keyboard,
    Image,
} from "react-native";
import { useRef } from "react";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
    const [yourLocation, setYourLocation] = useState("");
    const [destination, setDestination] = useState("");
    const [activeTab, setActiveTab] = useState("Home");
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedBus, setSelectedBus] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [isResultsMinimized, setIsResultsMinimized] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null); // Tracks clicked bus for expanded view
    const [complaintBus, setComplaintBus] = useState("");
    const [complaintText, setComplaintText] = useState("");
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const busNumbers = ["370", "515", "335/10", "353/6", "120", "138", "100", "01", "02"];

    // Animation values
    const sheetHeight = useRef(new Animated.Value(0)).current; // 0 for minimized (default on Home), 1 for expanded
    const resultsSheetAnim = useRef(new Animated.Value(1)).current; // 1 for max, 0 for min

    useEffect(() => {
        if (activeTab === "Home") {
            toggleSheet(true); // Minimize on Home
        } else if (activeTab === "Search") {
            toggleSheet(false); // Expand on Search Route
        }
    }, [activeTab]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            "keyboardDidShow",
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            "keyboardDidHide",
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const toggleResultsSheet = (minimize) => {
        setIsResultsMinimized(minimize);
        Animated.spring(resultsSheetAnim, {
            toValue: minimize ? 0 : 1,
            friction: 8,
            tension: 50,
            useNativeDriver: false,
        }).start();
    };

    const panResponderResults = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureStatus) => {
                return Math.abs(gestureStatus.dy) > 20;
            },
            onPanResponderRelease: (_, gestureStatus) => {
                if (gestureStatus.dy > 50) {
                    toggleResultsSheet(true); // Dragged down
                } else if (gestureStatus.dy < -50) {
                    toggleResultsSheet(false); // Dragged up
                }
            },
        })
    ).current;

    const animatedResultsListStyle = {
        height: resultsSheetAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, SCREEN_HEIGHT * 0.3], // Controlled height
        }),
        opacity: resultsSheetAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        overflow: "hidden",
    };

    const animatedRouteChipStyle = {
        bottom: resultsSheetAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [210, SCREEN_HEIGHT * 0.3 + 180 + 12 + 18], // Increased gap to ensure separation
        }),
    };

    const toggleSheet = (minimize) => {
        setIsMinimized(minimize);
        Animated.spring(sheetHeight, {
            toValue: minimize ? 0 : 1,
            friction: 8,
            tension: 50,
            useNativeDriver: false,
        }).start();
    };


    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureStatus) => {
                if (activeTab === "Home") return false; // Lock expansion on Home
                return Math.abs(gestureStatus.dy) > 20;
            },
            onPanResponderRelease: (_, gestureStatus) => {
                if (gestureStatus.dy > 50) {
                    toggleSheet(true); // Dragged down enough
                } else if (gestureStatus.dy < -50) {
                    toggleSheet(false); // Dragged up enough
                }
            },
        })
    ).current;

    const pickFile = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const fileName = result.assets[0].uri.split('/').pop();
            setSelectedFile(fileName);
        }
    };

    const animatedInputsStyle = {
        height: sheetHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 160], // Height of the inputs container
        }),
        opacity: sheetHeight.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        overflow: "hidden",
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Map Background */}
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

            {/* Top Search Bar (Shown on Home and Search tabs and NOT in results) */}
            {!showResults && (activeTab === "Home" || activeTab === "Search") && (
                <TouchableOpacity
                    activeOpacity={activeTab === "Home" ? 0.9 : 1}
                    onPress={() => {
                        if (activeTab === "Home") setActiveTab("Search");
                    }}
                    style={styles.topSearch}
                >
                    <View style={styles.spBadge}>
                        <Text style={styles.spText}>SP</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginRight: 12 }}>
                        <Text style={selectedBus ? styles.searchTextTitle : styles.searchPlaceholder}>
                            {selectedBus ? "Route No" : "Search Bus"}
                        </Text>
                        {!selectedBus && <Text style={styles.exampleText}>Eg:370</Text>}
                    </View>
                    {selectedBus && <Text style={styles.selectedBusNumber}>{selectedBus}</Text>}
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="mic-outline" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications" size={20} color="#C41E3A" />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Bus Number Chips (Shown on Home and Search tabs and NOT in results) */}
            {!showResults && (activeTab === "Home" || activeTab === "Search") && (
                <View style={styles.busChipsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.busChipsScroll}
                    >
                        {busNumbers.map((num, idx) => {
                            const isSelected = selectedBus === num;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.busChip, isSelected && styles.busChipSelected]}
                                    onPress={() => setSelectedBus(isSelected ? null : num)}
                                >
                                    <Ionicons
                                        name="bus-outline"
                                        size={14}
                                        color={isSelected ? "#fff" : "#333"}
                                    />
                                    <Text style={[styles.busChipText, isSelected && styles.busChipTextSelected]}>
                                        {num}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}


            {/* Home Screen - Minimal Notice View */}
            {!showResults && activeTab === "Home" && (
                <View style={styles.homeNoticeSheet}>
                    <View style={styles.homeHandleContainer}>
                        <View style={styles.handleBar} />
                    </View>
                    <View style={styles.noticeBanner}>
                        <Text style={styles.noticeText}>
                            The Launching ceremony will be held on 05th January 2026
                        </Text>
                        <Text style={styles.noticeBy}>NOTICE BY SPRPTA</Text>
                    </View>
                    <Text style={styles.developerText}>
                        Developed By ALDTAN | ©2025 SPDRS. All rights reserved.
                    </Text>
                </View>
            )}

            {/* Search Route - Interactive Input Sheet */}
            {!showResults && activeTab === "Search" && (
                <View style={styles.bottomSheet}>
                    <View {...panResponder.panHandlers} style={styles.handleContainer}>
                        <Animated.View style={{ opacity: sheetHeight, flex: 1, alignItems: "flex-start" }}>
                            <TouchableOpacity onPress={() => toggleSheet(true)}>
                                <Ionicons name="chevron-back" size={20} color="#333" />
                            </TouchableOpacity>
                        </Animated.View>
                        <View style={styles.handleBar} />
                        <Animated.View style={{ opacity: sheetHeight, flex: 1, alignItems: "flex-end" }}>
                            <TouchableOpacity onPress={() => console.log("Swap")}>
                                <Ionicons name="swap-vertical" size={20} color="#333" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <Animated.View style={animatedInputsStyle}>
                        <View style={styles.inputsContainer}>
                            <View style={styles.inputRow}>
                                <View style={styles.dotIndicator}>
                                    <View style={styles.blueDot} />
                                    <View style={styles.dashedLine} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your location"
                                    placeholderTextColor="#999"
                                    value={yourLocation}
                                    onChangeText={setYourLocation}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <View style={styles.dotIndicator}>
                                    <Ionicons name="location-sharp" size={18} color="#C41E3A" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Choose destination"
                                    placeholderTextColor="#999"
                                    value={destination}
                                    onChangeText={setDestination}
                                    onSubmitEditing={() => setShowResults(true)}
                                />
                                <Ionicons name="chevron-forward" size={18} color="#999" />
                            </View>
                        </View>
                    </Animated.View>

                    {/* Notice area also visible in Search mode (minimized state) */}
                    <View style={styles.noticeBanner}>
                        <Text style={styles.noticeText}>
                            The Launching ceremony will be held on 05th January 2026
                        </Text>
                        <Text style={styles.noticeBy}>NOTICE BY SPRPTA</Text>
                    </View>
                    <Text style={styles.developerText}>
                        Developed By ALDTAN | ©2025 SPDRS. All rights reserved.
                    </Text>
                </View>
            )}

            {/* Search Results View */}
            {showResults && (
                <>
                    {/* Top Compact Search Header */}
                    <View style={styles.resultsHeader}>
                        <View style={styles.resultsInputsContainer}>
                            <View style={styles.resultsInputRow}>
                                <View style={styles.circleMarker} />
                                <Text style={styles.resultsInputText}>Galle Central Bus Stand</Text>
                                <MaterialCommunityIcons name="dots-vertical" size={20} color="#333" />
                            </View>
                            <View style={styles.resultsDivider} />
                            <View style={styles.resultsInputRow}>
                                <Ionicons name="location-sharp" size={20} color="#C41E3A" />
                                <Text style={styles.resultsInputText}>Baddegama</Text>
                                <Ionicons name="swap-vertical" size={20} color="#333" />
                            </View>
                        </View>
                    </View>

                    {/* Route Badge Overlay - Small Rectangular Chip */}
                    <Animated.View style={[styles.routeBadgeOverlay, animatedRouteChipStyle]}>
                        <View style={styles.routeBadge}>
                            <Text style={styles.routeNameChipText}>370 ROUTE</Text>
                        </View>
                    </Animated.View>

                    {/* Results Bottom Sheet */}
                    <View style={styles.resultsBottomSheet}>
                        <View {...panResponderResults.panHandlers} style={styles.handleContainerResults}>
                            <View style={styles.handleBarResults} />
                        </View>

                        <View style={styles.resultsSheetHeader}>
                            <View style={styles.brandContainer}>
                                <View style={styles.spBadgeSmall}>
                                    <Text style={styles.spTextSmall}>SP</Text>
                                </View>
                                <Text style={styles.brandText}>RPTA</Text>
                            </View>
                            <Text style={styles.currentTimeText}>Current: 1:45 PM</Text>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.actionCircleButton}>
                                    <Ionicons name="share-social-outline" size={20} color="#333" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionCircleButton}
                                    onPress={() => {
                                        if (selectedResult) {
                                            setSelectedResult(null); // Collapse to list
                                        } else {
                                            setShowResults(false); // Close results entirely
                                        }
                                    }}
                                >
                                    <Ionicons name="close" size={18} color="#333" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Animated.View style={animatedResultsListStyle}>
                            {!selectedResult ? (
                                <ScrollView
                                    style={styles.busList}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {[1, 2, 3].map((_, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.busItem}
                                            onPress={() => setSelectedResult({ id: idx, number: "ND-0671" })}
                                        >
                                            <View style={styles.busItemLeft}>
                                                <Ionicons name="bus" size={20} color="#333" />
                                                <View style={styles.busBadgeContainer}>
                                                    <View style={styles.blueBadge}>
                                                        <Text style={styles.badgeText}>ND-0671</Text>
                                                    </View>
                                                    <View style={styles.blueBadge}>
                                                        <Text style={styles.badgeText}>Running</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.statusDot} />
                                            </View>
                                            <View style={styles.busItemRight}>
                                                <Text style={styles.durationText}>0hr 50 min</Text>
                                            </View>
                                            <View style={styles.busRouteDetails}>
                                                <Text style={styles.routeTimes}>
                                                    <Text style={styles.boldCity}>Galle</Text> 1:00 PM - <Text style={styles.boldCity}>Baddegama</Text> 1:50 PM
                                                </Text>
                                            </View>
                                            <View style={styles.itemDivider} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            ) : (
                                <ScrollView style={styles.expandedScroll} showsVerticalScrollIndicator={false}>
                                    <View style={styles.expandedContainer}>
                                        {/* Expanded Header */}
                                        <View style={styles.expandedHeader}>
                                            <Ionicons name="bus" size={20} color="#333" />
                                            <View style={styles.blueBadgeLarge}>
                                                <Text style={styles.badgeTextLarge}>ND-0671</Text>
                                            </View>
                                            <View style={styles.blueBadgeLarge}>
                                                <Text style={styles.badgeTextLarge}>Running</Text>
                                            </View>
                                            <View style={styles.statusDotLarge} />
                                        </View>

                                        <Text style={styles.routePathText}>
                                            <Text style={styles.boldText}>From</Text> Galle 1:00 PM <Text style={styles.boldText}>To</Text> Baddegama 1:50 PM
                                        </Text>

                                        {/* Timeline */}
                                        <View style={styles.timelineContainer}>
                                            <View style={styles.timelineTrack}>
                                                <View style={styles.timelinePointActive}>
                                                    <Ionicons name="bus" size={10} color="#fff" />
                                                </View>
                                                <View style={styles.timelineLine} />
                                                <View style={styles.timelinePoint} />
                                            </View>
                                            <View style={styles.timelineContent}>
                                                <View style={styles.timelineItem}>
                                                    <Text style={styles.timelineTime}>1:00 PM</Text>
                                                    <Text style={styles.timelineCity}>Galle</Text>
                                                </View>
                                                <View style={styles.timelineItem}>
                                                    <Text style={styles.timelineTime}>1:30 PM</Text>
                                                    <Text style={styles.timelineCity}>Poddala</Text>
                                                </View>
                                                <View style={styles.timelineItem}>
                                                    <Text style={styles.timelineTime}>1:50 PM</Text>
                                                    <Text style={styles.timelineCity}>Baddegama</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Status Section */}
                                        <View style={styles.statusInfoRow}>
                                            <View style={styles.arrivalBadge}>
                                                <Text style={styles.arrivalLabel}>Arrives to you at </Text>
                                                <Text style={styles.arrivalTime}>11:31</Text>
                                            </View>
                                            <Text style={styles.delayText}>Delayed 21 min</Text>
                                        </View>
                                    </View>
                                </ScrollView>
                            )}
                        </Animated.View>

                        <View style={styles.noticeBannerSmall}>
                            <Text style={styles.noticeTextSmall}>
                                The Launching ceremony will be held on 05th January 2026
                            </Text>
                            <Text style={styles.noticeBySmall}>NOTICE FROM SPRPTA</Text>
                        </View>
                        <Text style={styles.developerTextSmall}>
                            Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
                        </Text>
                    </View>
                </>
            )}



            {/* Bottom Navigation - Separate Section (Hidden when keyboard is active) */}
            {!showResults && !isKeyboardVisible && (
                <View style={styles.bottomNavContainer}>
                    <View style={styles.bottomNav}>
                        <TouchableOpacity
                            style={styles.navTab}
                            onPress={() => setActiveTab("Home")}
                        >
                            <View style={activeTab === "Home" ? styles.activeTabBg : styles.inactiveTabBg}>
                                <Ionicons
                                    name="home"
                                    size={20}
                                    color={activeTab === "Home" ? "#333" : "#999"}
                                />
                                <Text style={[styles.navLabel, activeTab === "Home" && styles.navLabelActive]}>
                                    Home
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navTab}
                            onPress={() => setActiveTab("Search")}
                        >
                            <View style={activeTab === "Search" ? styles.activeTabBg : styles.inactiveTabBg}>
                                <MaterialCommunityIcons
                                    name="map-marker-path"
                                    size={20}
                                    color={activeTab === "Search" ? "#333" : "#999"}
                                />
                                <Text style={[styles.navLabel, activeTab === "Search" && styles.navLabelActive]}>
                                    Search Route
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navTab}
                            onPress={() => setActiveTab("Complain")}
                        >
                            <View style={activeTab === "Complain" ? styles.activeTabBg : styles.inactiveTabBg}>
                                <Ionicons
                                    name="calendar"
                                    size={20}
                                    color={activeTab === "Complain" ? "#333" : "#999"}
                                />
                                <Text style={[styles.navLabel, activeTab === "Complain" && styles.navLabelActive]}>
                                    Complain
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Complain Screen View */}
            {!showResults && activeTab === "Complain" && (
                <View style={[
                    styles.bottomSheet,
                    styles.complainSheet,
                ]}>
                    <View style={styles.handleContainerResults}>
                        <View style={styles.handleBarResults} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.complainScrollContent}>
                        <View style={styles.complainHeader}>
                            <View style={styles.brandContainerCenter}>
                                <Image
                                    source={require('../../assets/logo.png')}
                                    style={styles.mainLogo}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.complainTitle}>ADD A COMPLAINT</Text>
                            <Text style={styles.complainSubtitle} numberOfLines={2}>
                                Add your complaints about the buses operated by Southern Provincial Road Passenger Transport Authority
                            </Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.fieldLabel}>Bus Number</Text>
                            <TextInput
                                style={styles.complainInput}
                                placeholder="Type bus number to search"
                                placeholderTextColor="#999"
                                value={complaintBus}
                                onChangeText={setComplaintBus}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.fieldLabel}>Complaint</Text>
                            <TextInput
                                style={[styles.complainInput, styles.complainInputMultiline]}
                                placeholder="Write your complaint here"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={4}
                                value={complaintText}
                                onChangeText={setComplaintText}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.fieldLabel}>Attachments (images/PDF, total ≤ 100 MB)</Text>
                            <TouchableOpacity
                                style={styles.attachmentButton}
                                onPress={pickFile}
                            >
                                <Text style={styles.attachmentText}>
                                    Choose Files <Text style={{ color: "#999", fontWeight: "400" }}>{selectedFile || "no files selected"}</Text>
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.attachmentSubtext}>Max total size 100 MB. Allowed: images or PDF.</Text>
                        </View>

                        <TouchableOpacity style={styles.submitButtonLarge}>
                            <Text style={styles.submitButtonText}>Submit Complaint</Text>
                        </TouchableOpacity>

                        <Text style={styles.termsText}>
                            By clicking continue, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>. Developed by <Text style={styles.linkText}>Aldtan</Text>.
                        </Text>

                        <View style={styles.noticeBannerSmall}>
                            <Text style={styles.noticeTextSmall}>
                                The Launching ceremony will be held on 05th January 2026
                            </Text>
                            <Text style={styles.noticeBySmall}>NOTICE FROM SPRPTA</Text>
                        </View>
                        <Text style={styles.developerTextSmall}>
                            Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
                        </Text>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    topSearch: {
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        height: 56,
        backgroundColor: "#fff",
        borderRadius: 28,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    spBadge: {
        width: 36,
        height: 36,
        backgroundColor: "#C41E3A",
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    spText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 14,
        color: "#333",
    },
    exampleText: {
        fontSize: 12,
        color: "#999",
        marginRight: 8,
    },
    searchTextTitle: {
        flex: 1,
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
    },
    selectedBusNumber: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#C41E3A",
        marginRight: 12,
    },
    iconButton: {
        padding: 8,
    },
    busChipsContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 130 : 110,
        left: 0,
        right: 0,
        zIndex: 9,
    },
    busChipsScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    busChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 70,
        justifyContent: "center",
    },
    busChipSelected: {
        backgroundColor: "#C41E3A",
    },
    busChipText: {
        marginLeft: 4,
        fontSize: 11,
        fontWeight: "600",
        color: "#333",
    },
    busChipTextSelected: {
        color: "#fff",
    },
    bottomSheet: {
        position: "absolute",
        bottom: 85,
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    handleContainer: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 4,
        height: 44,
    },
    handleBar: {
        width: 36,
        height: 4,
        backgroundColor: "#E0E0E0",
        borderRadius: 2,
    },
    inputsContainer: {
        marginTop: 4,
        marginBottom: 2,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
    },
    dotIndicator: {
        width: 24,
        alignItems: "center",
        marginRight: 12,
    },
    blueDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#4A90E2",
    },
    dashedLine: {
        width: 2,
        height: 20,
        borderLeftWidth: 2,
        borderLeftColor: "#ddd",
        borderStyle: "dotted",
        marginTop: 4,
    },
    input: {
        flex: 1,
        height: 46,
        backgroundColor: "#F5F5F5",
        borderRadius: 24,
        paddingHorizontal: 16,
        fontSize: 13,
        color: "#333",
    },
    noticeBanner: {
        backgroundColor: "#FFE4E9",
        borderRadius: 12,
        padding: 9,
        marginBottom: 7,
        marginTop: 0,
    },
    noticeText: {
        fontSize: 9.5,
        color: "#333",
        textAlign: "center",
        marginBottom: 3,
        lineHeight: 14,
    },
    noticeBy: {
        fontSize: 7.5,
        color: "#666",
        textAlign: "center",
    },
    developerText: {
        fontSize: 8.5,
        color: "#999",
        textAlign: "center",
        marginBottom: 4,
        marginTop: 2,
    },
    bottomNavContainer: {
        position: "absolute",
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: "#fff",
        borderRadius: 40,
        paddingVertical: 4,
        paddingHorizontal: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    navTab: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 12,
        flex: 1,
    },
    activeTabBg: {
        backgroundColor: "#FFE4E9",
        borderRadius: 30,
        width: 100,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    inactiveTabBg: {
        width: 100,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    navLabel: {
        marginTop: 4,
        fontSize: 9.5,
        color: "#999",
        textAlign: "center",
    },
    navLabelActive: {
        color: "#333",
        fontWeight: "600",
    },
    // Results View Styles
    resultsHeader: {
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    resultsInputsContainer: {
        gap: 8,
    },
    resultsInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    circleMarker: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#333",
        backgroundColor: "#fff",
    },
    resultsInputText: {
        flex: 1,
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    resultsDivider: {
        height: 1,
        backgroundColor: "#eee",
        marginLeft: 24,
    },
    routeBadgeOverlay: {
        position: "absolute",
        left: 16, // Precisely aligned with the results panel left edge
        zIndex: 10,
    },
    routeBadge: {
        backgroundColor: "#C41E3A",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
    },
    routeNameChipText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    resultsBottomSheet: {
        position: "absolute",
        bottom: 12, // Adjusted for the search results specific layout
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
        minHeight: 180, // Height of notice area + header
    },
    handleContainerResults: {
        width: "100%",
        paddingTop: 12,
        paddingBottom: 8,
        alignItems: "center",
    },
    handleBarResults: {
        width: 36,
        height: 4,
        backgroundColor: "#E0E0E0",
        borderRadius: 2,
    },
    resultsSheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    brandContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    spBadgeSmall: {
        width: 24,
        height: 24,
        backgroundColor: "#C41E3A",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    spTextSmall: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    brandText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    currentTimeText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    actionCircleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F5F5F5",
        alignItems: "center",
        justifyContent: "center",
    },
    busList: {
        flex: 1,
    },
    busItem: {
        marginBottom: 16,
    },
    busItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    busBadgeContainer: {
        flexDirection: "row",
        gap: 4,
    },
    blueBadge: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "600",
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#4CD964",
        marginLeft: 4,
    },
    busItemRight: {
        position: "absolute",
        top: 0,
        right: 0,
    },
    durationText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    busRouteDetails: {
        marginTop: 8,
        marginLeft: 32,
    },
    routeTimes: {
        fontSize: 12,
        color: "#666",
    },
    boldCity: {
        fontWeight: "bold",
        color: "#333",
    },
    itemDivider: {
        height: 1,
        backgroundColor: "#eee",
        marginTop: 16,
    },
    noticeBannerSmall: {
        backgroundColor: "#FFE4E9",
        borderRadius: 16,
        padding: 12,
        marginTop: 16,
        marginBottom: 8,
    },
    noticeTextSmall: {
        fontSize: 10,
        color: "#333",
        textAlign: "center",
        marginBottom: 4,
        lineHeight: 18,
    },
    noticeBySmall: {
        fontSize: 9,
        color: "#666",
        textAlign: "center",
        fontWeight: "600",
    },
    developerTextSmall: {
        fontSize: 9,
        color: "#999",
        textAlign: "center",
    },
    // Expanded View Styles
    expandedScroll: {
        flex: 1,
    },
    expandedContainer: {
        paddingTop: 8,
        paddingBottom: 20,
    },
    expandedHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    blueBadgeLarge: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    badgeTextLarge: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "bold",
    },
    statusDotLarge: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#4CD964",
    },
    routePathText: {
        fontSize: 12,
        color: "#333",
        marginBottom: 16,
    },
    boldText: {
        fontWeight: "bold",
    },
    timelineContainer: {
        flexDirection: "row",
        marginLeft: 4,
        marginBottom: 24,
    },
    timelineTrack: {
        alignItems: "center",
        width: 20,
    },
    timelinePointActive: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#A78BFA",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
    },
    timelineLine: {
        width: 6,
        flex: 1,
        backgroundColor: "#A78BFA",
        opacity: 0.5,
        marginVertical: -2,
    },
    timelinePoint: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: "#A78BFA",
        backgroundColor: "#fff",
        zIndex: 2,
    },
    timelineContent: {
        marginLeft: 12,
        gap: 8,
    },
    timelineItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timelineTime: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
        width: 70,
    },
    timelineCity: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
    statusInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    arrivalBadge: {
        backgroundColor: "#CBB6E5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    arrivalLabel: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "500",
    },
    arrivalTime: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "bold",
    },
    delayText: {
        color: "#FF3B30",
        fontSize: 13,
        fontWeight: "bold",
    },
    // Complain Screen Styles
    complainSheet: {
        top: Platform.OS === "ios" ? 60 : 40,
        bottom: 85,
        paddingTop: 0,
    },
    complainScrollContent: {
        paddingBottom: 40,
        paddingHorizontal: 4,
    },
    closeButtonAbs: {
        position: "absolute",
        right: 12,
        top: 12,
        backgroundColor: "#F2F2F2",
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    complainHeader: {
        alignItems: "center",
        marginBottom: 12,
    },
    brandContainerCenter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        height: 32,
    },
    mainLogo: {
        width: 110,
        height: '100%',
    },
    spBadgeSmallCircle: {
        width: 24,
        height: 24,
        backgroundColor: "#C41E3A",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    searchRouteHeader: {
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        alignItems: "center",
        zIndex: 10,
    },
    brandTextLarge: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginLeft: 8,
    },
    complainTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
        marginBottom: 12,
    },
    complainSubtitle: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    formGroup: {
        marginBottom: 10,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    complainInput: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 13,
        color: "#333",
    },
    complainInputMultiline: {
        height: 100,
        paddingTop: 12,
        textAlignVertical: "top",
    },

    attachmentButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 44,
        justifyContent: "center",
    },
    attachmentText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#000",
    },
    attachmentSubtext: {
        fontSize: 10,
        color: "#999",
        marginTop: 6,
    },
    submitButtonLarge: {
        backgroundColor: "#C41E3A",
        height: 54,
        borderRadius: 27,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 12,
        shadowColor: "#C41E3A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    termsText: {
        fontSize: 9,
        color: "#999",
        textAlign: "center",
        lineHeight: 14,
        marginBottom: 20,
        paddingHorizontal: 40,
    },
    linkText: {
        textDecorationLine: "underline",
    },
    handleContainerHome: {
        width: "100%",
        paddingTop: 12,
        paddingBottom: 8,
        alignItems: "center",
    },
    homeNoticeSheet: {
        position: "absolute",
        bottom: 85,
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 0,
        paddingBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    homeHandleContainer: {
        width: "100%",
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
});
