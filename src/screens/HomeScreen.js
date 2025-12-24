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
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert,
    BackHandler,
} from "react-native";
import { useRef } from "react";
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from "react-native-maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { ENDPOINTS } from "../constants/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
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
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedRouteData, setSelectedRouteData] = useState(null);
    const [topSearchQuery, setTopSearchQuery] = useState("");
    const [timetableData, setTimetableData] = useState([]);
    const [isTimetableLoading, setIsTimetableLoading] = useState(false);
    const [quickRoutes, setQuickRoutes] = useState([]);
    const [routePath, setRoutePath] = useState([]);
    const [routeStops, setRouteStops] = useState([]);
    const [liveBusData, setLiveBusData] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Animation values
    const scrollX = useRef(new Animated.Value(0)).current;

    // Helper to calculate distance between two coordinates (Haversine formula)
    const getDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };
    const sheetHeight = useRef(new Animated.Value(0)).current; // 0 for minimized (default on Home), 1 for expanded
    const resultsSheetAnim = useRef(new Animated.Value(1)).current; // 1 for max, 0 for min
    const mapRef = useRef(null);
    const prevLiveBusDataRef = useRef([]);

    useEffect(() => {
        if (activeTab === "Home") {
            toggleSheet(true); // Minimize on Home
        } else if (activeTab === "Search") {
            // Trigger upward animation
            sheetHeight.setValue(0);
            setIsMinimized(false);
            Animated.spring(sheetHeight, {
                toValue: 1,
                friction: 8,
                tension: 50,
                useNativeDriver: false,
            }).start();
        }
    }, [activeTab]);

    // Handle Android Hardware Back Button
    useEffect(() => {
        const backAction = () => {
            // 1. If a specific bus is selected in the carousel (detailed view), close it
            if (selectedResult) {
                setSelectedResult(null);
                return true;
            }

            // 2. If list of search results is showing, go back to top search input mode
            if (showResults) {
                setShowResults(false);
                setSelectedRouteData(null); // Clear route data to clear map lines
                setRoutePath([]);
                setRouteStops([]);
                setTopSearchQuery(""); // Optional: clear query
                return true;
            }

            // 3. If on a tab other than Home (e.g., Search, Complain), go back to Home
            if (activeTab !== "Home") {
                setActiveTab("Home");
                return true;
            }

            // 4. Default behavior (exit app) if on Home with no overlays
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [selectedResult, showResults, activeTab]);

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

    // Fetch popular routes for chips on mount
    useEffect(() => {
        const fetchQuickRoutes = async () => {
            try {
                // Fetch routes with a general search to get top results
                const response = await fetch(`${ENDPOINTS.ROUTES}?searchKey=`);
                const json = await response.json();
                if (json.data && json.data.length > 0) {
                    // Take first 10 routes for quick selection
                    setQuickRoutes(json.data.slice(0, 10));
                }
            } catch (error) {
                console.error("Error fetching quick routes:", error);
                // Fallback to empty if API fails
                setQuickRoutes([]);
            }
        };
        fetchQuickRoutes();
    }, []);

    // Real-time GPS Polling (1s interval)
    useEffect(() => {
        let interval;
        const deviceStates = {}; // Local state to track movements: { id: { lat, lon, lastMoveTime, speed } }

        const fetchLiveLocations = async () => {
            try {
                const response = await fetch(ENDPOINTS.LIVE_DEVICES);
                const json = await response.json();
                if (Array.isArray(json)) {
                    const now = Date.now();
                    const processedData = json.map(device => {
                        let state = deviceStates[device.id];
                        let speed = state?.speed || 0;

                        if (!state) {
                            deviceStates[device.id] = {
                                lat: device.lat,
                                lon: device.lon,
                                lastMoveTime: now,
                                speed: 0
                            };
                        } else if (device.lat && device.lon) {
                            const distance = getDistance(state.lat, state.lon, device.lat, device.lon);

                            // If bus has moved more than 2 meters, calculate speed
                            if (distance > 0.002) {
                                const timeDiffSeconds = (now - state.lastMoveTime) / 1000;
                                if (timeDiffSeconds > 0) {
                                    const calculatedSpeed = (distance / timeDiffSeconds) * 3600;
                                    // Use EMA for smoothing (50% new, 50% old for faster response)
                                    speed = Math.round((speed * 0.5) + (calculatedSpeed * 0.5));
                                    if (speed > 120) speed = 120; // Cap realistic speed

                                    // Update state with new position and time
                                    deviceStates[device.id] = {
                                        lat: device.lat,
                                        lon: device.lon,
                                        lastMoveTime: now,
                                        speed
                                    };
                                }
                            } else {
                                // If hasn't moved for more than 10 seconds, set speed to 0
                                if (now - state.lastMoveTime > 10000) {
                                    speed = 0;
                                    deviceStates[device.id].speed = 0;
                                }
                            }
                        }
                        return { ...device, speed };
                    });

                    setLiveBusData(processedData);

                    // Auto-follow selected bus
                    if (selectedResult) {
                        const device = processedData.find(d =>
                            (selectedResult.deviceId && d.id === selectedResult.deviceId) ||
                            (selectedResult.id && d.busTurnId === selectedResult.id) ||
                            (selectedResult.runningSlotId && d.runningSlotId === selectedResult.runningSlotId)
                        );
                        if (device && device.lat && device.lon && mapRef.current) {
                            mapRef.current.animateToRegion({
                                latitude: device.lat,
                                longitude: device.lon,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }, 500);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching live locations:", error);
            }
        };

        // Initial fetch
        fetchLiveLocations();

        // Start interval
        interval = setInterval(fetchLiveLocations, 500);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    // Current Time Clock (updates every minute)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const formatCurrentTime = (date) => {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    };

    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return "---";
        const startH = parseInt(startTime.substring(0, 2));
        const startM = parseInt(startTime.substring(2, 4));
        const endH = parseInt(endTime.substring(0, 2));
        const endM = parseInt(endTime.substring(2, 4));

        let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
        if (diffMins < 0) diffMins += 24 * 60;

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}hr ${m} min`;
    };

    const fetchTimetable = async (routeId) => {
        setIsTimetableLoading(true);
        try {
            const response = await fetch(ENDPOINTS.TIMETABLE(routeId));
            const json = await response.json();
            if (Array.isArray(json)) {
                setTimetableData(json);
            }
        } catch (error) {
            console.error("Error fetching timetable:", error);
        } finally {
            setIsTimetableLoading(false);
        }
    };

    const fetchRoutePath = async (routeId) => {
        try {
            const response = await fetch(ENDPOINTS.ROUTE_META(routeId));
            const json = await response.json();
            if (json.meta && json.meta.standardRoutePath) {
                const path = json.meta.standardRoutePath;
                setRoutePath(path);

                // Collect unique stops from upStops and downStops
                const stops = [];
                if (json.upStops) stops.push(...json.upStops);
                if (json.downStops) {
                    json.downStops.forEach(ds => {
                        if (!stops.find(s => s.id === ds.id)) {
                            stops.push(ds);
                        }
                    });
                }
                setRouteStops(stops);

                // Fit map to coordinates
                if (mapRef.current && path.length > 0) {
                    mapRef.current.fitToCoordinates(path, {
                        edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
                        animated: true,
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching route path:", error);
        }
    };

    const fetchRoutes = async (query) => {
        if (query.length < 2) {
            setSearchSuggestions([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`${ENDPOINTS.ROUTES}?searchKey=${query}`);
            const json = await response.json();
            if (json.data) {
                setSearchSuggestions(json.data);
            }
        } catch (error) {
            console.error("Error fetching routes:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr.length !== 4) return timeStr;
        const hours = parseInt(timeStr.substring(0, 2));
        const minutes = timeStr.substring(2);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    };

    const timeToMinutes = (timeStr) => {
        if (!timeStr || timeStr.length !== 4) return 0;
        const hours = parseInt(timeStr.substring(0, 2));
        const minutes = parseInt(timeStr.substring(2));
        return hours * 60 + minutes;
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

    const handleSelectRoute = (route) => {
        setYourLocation(route.start.name);
        setDestination(route.end.name);
        setSelectedRouteData(route);
        setSearchSuggestions([]);

        // Fetch timetable for the selected route
        if (route.id) {
            fetchTimetable(route.id);
            fetchRoutePath(route.id);
        }

        // Optional: Trigger results view
        setTimeout(() => {
            setShowResults(true);
        }, 300);
    };

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
            outputRange: [0, 260], // Fixed height for ~3 results (3 * ~70px + headers/padding)
        }),
        opacity: resultsSheetAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        overflow: "hidden",
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

    const guessMimeFromName = (name = "") => {
        const lower = name.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        return "application/octet-stream";
    };

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
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.uri.split('/').pop(),
                type: asset.mimeType || guessMimeFromName(asset.uri.split('/').pop())
            });
        }
    };



    const handleToggleDirection = async () => {
        // Swap text inputs
        const currentLoc = yourLocation;
        const currentDest = destination;
        setYourLocation(currentDest);
        setDestination(currentLoc);

        if (selectedRouteData) {
            const routeNo = selectedRouteData.routeNumber;
            // Try to find the reverse route in current suggestions or fetch it
            try {
                const response = await fetch(`${ENDPOINTS.ROUTES}?searchKey=${routeNo}`);
                const json = await response.json();
                if (json.data && Array.isArray(json.data)) {
                    // Find the route that matches the routeNo and has swapped start/end
                    const reverseRoute = json.data.find(r =>
                        r.routeNumber === routeNo &&
                        r.start.name === selectedRouteData.end.name &&
                        r.end.name === selectedRouteData.start.name
                    );

                    if (reverseRoute) {
                        handleSelectRoute(reverseRoute);
                    } else if (json.data.length > 0) {
                        // Fallback: If literal name match fails, find the one that isn't the current one
                        const otherRoute = json.data.find(r => r.routeNumber === routeNo && r.id !== selectedRouteData.id);
                        if (otherRoute) handleSelectRoute(otherRoute);
                    }
                }
            } catch (error) {
                console.error("Error toggling direction:", error);
            }
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
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            {/* Map Background */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                    latitude: 6.84,
                    longitude: 80.003,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                }}
            >
                {routePath.length > 0 && (
                    <Polyline
                        coordinates={routePath}
                        strokeColor="#b20a37"
                        strokeWidth={4}
                        lineJoin="round"
                    />
                )}
                {routeStops.map((stop) => (
                    <Marker
                        key={`stop-${stop.id}`}
                        coordinate={{
                            latitude: parseFloat(stop.latitude),
                            longitude: parseFloat(stop.longitude)
                        }}
                        title={stop.name}
                        description={stop.type.replace(/_/g, ' ')}
                    >
                        <View style={styles.stopMarker}>
                            <View style={[styles.stopInner, stop.type === 'bus_stand' && { backgroundColor: '#b20a37' }]} />
                        </View>
                    </Marker>
                ))}

                {/* Live Bus Markers */}
                {liveBusData.map((device) => {
                    const isSelected = selectedResult && (
                        (selectedResult.deviceId && device.id && selectedResult.deviceId === device.id) ||
                        (selectedResult.id && device.busTurnId && selectedResult.id === device.busTurnId) ||
                        (selectedResult.runningSlotId && device.runningSlotId && selectedResult.runningSlotId === device.runningSlotId)
                    );
                    const deviceRouteNumber = device.routePermitBus?.route?.routeNumber;
                    const activeRouteNumber = selectedRouteData?.routeNumber;

                    // Filter Logic:
                    // 1. If we are in "Search Results" view:
                    //    - Show the selected bus (isSelected)
                    //    - Show other buses on the SAME route (deviceRouteNumber === activeRouteNumber)
                    // 2. If NOT in results view, show all (for debugging as requested previously)
                    if (showResults) {
                        if (!isSelected && deviceRouteNumber !== activeRouteNumber) return null;
                    }

                    if (!device.lat || !device.lon) return null;

                    return (
                        <Marker
                            key={`live-${device.id}`}
                            coordinate={{
                                latitude: device.lat,
                                longitude: device.lon
                            }}
                            title={device.routePermitBus?.busNumber || "Live Bus"}
                            description={`Speed: ${device.speed || 0} km/h | Status: ${device.isOnline ? 'Online' : 'Offline'}`}
                            zIndex={isSelected ? 10 : 5}
                            anchor={{ x: 0.5, y: 0.5 }}
                            onPress={() => {
                                // Find which slot this device belongs to
                                const slot = timetableData.find(s =>
                                    (s.deviceId && device.id && s.deviceId === device.id) ||
                                    (s.id && device.busTurnId && s.id === device.busTurnId) ||
                                    (s.runningSlotId && device.runningSlotId && s.runningSlotId === device.runningSlotId)
                                );
                                if (slot) {
                                    setSelectedResult(slot);
                                    toggleResultsSheet(false); // Expand results to show details
                                }
                            }}
                        >
                            <View style={styles.liveBusMarker}>
                                <View style={[
                                    styles.liveBusMarkerPulse,
                                    { backgroundColor: isSelected ? 'rgba(76, 217, 100, 0.4)' : (device.isOnline ? 'rgba(153, 153, 153, 0.2)' : 'rgba(153, 153, 153, 0.1)') },
                                    !isSelected && { width: 30, height: 30, borderRadius: 15 } // Smaller pulse for non-selected
                                ]} />
                                <View style={[
                                    styles.liveBusMarkerInner,
                                    { backgroundColor: isSelected ? '#4CD964' : (device.isOnline ? '#4CD964' : '#999') }, // Green for selected/online, Gray for offline
                                    !isSelected && { width: 24, height: 24, borderRadius: 12 }
                                ]}>
                                    <MaterialCommunityIcons
                                        name={isSelected ? "bus" : "bus-side"}
                                        size={isSelected ? 20 : 14}
                                        color="#fff"
                                    />
                                </View>

                            </View>
                        </Marker>
                    );
                })}
            </MapView>
            {/* Top Search Bar (Shown on Home and Search tabs and NOT in results) */}
            {!showResults && (activeTab === "Home" || activeTab === "Search") && (
                <View style={[styles.topSearch, activeTab === "Home" && { opacity: 0.9 }]}>
                    <View style={styles.spBadge}>
                        <Text style={styles.spText}>SP</Text>
                    </View>
                    <TextInput
                        style={styles.topInput}
                        placeholder="Search Bus or Route"
                        placeholderTextColor="#999"
                        value={topSearchQuery}
                        onChangeText={(text) => {
                            setTopSearchQuery(text);
                            fetchRoutes(text);
                        }}
                        onFocus={() => {
                            if (activeTab === "Home") setActiveTab("Search");
                        }}
                    />
                    {!topSearchQuery && !selectedBus && <Text style={styles.exampleTextTop}>Eg:370</Text>}
                    {selectedBus && <Text style={styles.selectedBusNumberTop}>{selectedBus}</Text>}
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="mic-outline" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications" size={20} color="#b20a37" />
                    </TouchableOpacity>

                    {/* Top Suggestions Dropdown */}
                    {topSearchQuery.length > 0 && searchSuggestions.length > 0 && (
                        <View style={styles.topSuggestionsContainer}>
                            <ScrollView keyboardShouldPersistTaps="handled">
                                {searchSuggestions.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.suggestionItem}
                                        onPress={() => {
                                            handleSelectRoute(item);
                                            setTopSearchQuery("");
                                        }}
                                    >
                                        <Ionicons name="bus-outline" size={18} color="#b20a37" />
                                        <Text style={styles.suggestionText}>
                                            <Text style={{ fontWeight: 'bold' }}>{item.routeNumber}</Text> - {item.start.name} to {item.end.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}

            {/* Bus Number Chips (Shown on Home and Search tabs and NOT in results) */}
            {!showResults && (activeTab === "Home" || activeTab === "Search") && (
                <View style={styles.busChipsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.busChipsScroll}
                    >
                        {quickRoutes.map((route) => {
                            const isSelected = selectedBus === route.routeNumber;
                            return (
                                <TouchableOpacity
                                    key={route.id}
                                    style={[styles.busChip, isSelected && styles.busChipSelected]}
                                    onPress={() => {
                                        setSelectedBus(isSelected ? null : route.routeNumber);
                                        if (!isSelected) {
                                            handleSelectRoute(route);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name="bus-outline"
                                        size={14}
                                        color={isSelected ? "#fff" : "#333"}
                                    />
                                    <Text style={[styles.busChipText, isSelected && styles.busChipTextSelected]}>
                                        {route.routeNumber}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}


            {/* Home Screen - Minimal Notice View */}
            {!showResults && activeTab === "Home" && (
                <View style={[styles.homeNoticeSheet, { bottom: 92 + insets.bottom }]}>
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={[styles.bottomSheet, { bottom: 92 + insets.bottom }]}
                    keyboardVerticalOffset={90}
                >
                    <View {...panResponder.panHandlers} style={styles.handleContainer}>
                        <Animated.View style={{ opacity: sheetHeight, flex: 1, alignItems: "flex-start" }}>
                            <TouchableOpacity onPress={() => toggleSheet(true)}>
                                <Ionicons name="chevron-back" size={20} color="#333" />
                            </TouchableOpacity>
                        </Animated.View>
                        <View style={styles.handleBar} />
                        <Animated.View style={{ opacity: sheetHeight, flex: 1, alignItems: "flex-end" }}>
                            <TouchableOpacity onPress={() => handleToggleDirection()}>
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
                                    placeholder="From: Select Terminal"
                                    placeholderTextColor="#999"
                                    value={yourLocation}
                                    onChangeText={(text) => {
                                        setYourLocation(text);
                                        fetchRoutes(text);
                                    }}
                                />
                            </View>
                            {searchSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <ScrollView>
                                        {searchSuggestions.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectRoute(item)}
                                            >
                                                <Ionicons name="bus-outline" size={18} color="#b20a37" />
                                                <Text style={styles.suggestionText}>
                                                    <Text style={{ fontWeight: 'bold' }}>{item.routeNumber}</Text> - {item.start.name} to {item.end.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            <View style={styles.inputRow}>
                                <View style={styles.dotIndicator}>
                                    <Ionicons name="location-sharp" size={18} color="#b20a37" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="To: Select Destination"
                                    placeholderTextColor="#999"
                                    value={destination}
                                    onChangeText={setDestination}
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
                </KeyboardAvoidingView>
            )}

            {/* Search Results View */}
            {showResults && (
                <>
                    {/* Top Compact Search Header */}
                    <View style={styles.resultsHeader}>
                        <View style={styles.resultsInputsContainer}>
                            <View style={styles.resultsInputRow}>
                                <View style={styles.circleMarker} />
                                <Text style={styles.resultsInputText}>{selectedRouteData?.start.name || "Start Terminal"}</Text>
                                <MaterialCommunityIcons name="dots-vertical" size={20} color="#333" />
                            </View>
                            <View style={styles.resultsDivider} />
                            <View style={styles.resultsInputRow}>
                                <Ionicons name="location-sharp" size={20} color="#b20a37" />
                                <Text style={styles.resultsInputText}>{selectedRouteData?.end.name || "Destination"}</Text>
                                <TouchableOpacity onPress={() => handleToggleDirection()}>
                                    <Ionicons name="swap-vertical" size={20} color="#333" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Results Bottom Sheet */}
                    <View style={[styles.resultsBottomSheet, { bottom: 20 + insets.bottom }]}>
                        {/* Route Badge Overlay - Attached to Top of Sheet */}
                        <View style={styles.routeBadgeAttached}>

                            <View style={styles.routeBadge}>
                                <Text style={styles.routeNameChipText}>{selectedRouteData?.routeNumber || "---"} ROUTE</Text>
                            </View>
                        </View>

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
                            <Text style={styles.currentTimeText}>Current: {formatCurrentTime(currentTime)}</Text>
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
                                            setRoutePath([]); // Clear path
                                            setRouteStops([]); // Clear stops
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
                                    {isTimetableLoading ? (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: '#999' }}>Loading Timetable...</Text>
                                        </View>
                                    ) : timetableData.length === 0 ? (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: '#999' }}>No buses scheduled for this route.</Text>
                                        </View>
                                    ) : (
                                        (() => {
                                            const now = new Date();
                                            const currentMinutes = now.getHours() * 60 + now.getMinutes();

                                            const activeBuses = timetableData.filter(item => {
                                                const stops = item.runningSlotBusStops || item.runningSlot?.runningSlotBusStops || [];
                                                if (stops.length === 0) return false;
                                                const lastStopMinutes = timeToMinutes(stops[stops.length - 1].weekdayTime);

                                                // Include if:
                                                // 1. Start time is >= current time (upcoming)
                                                // 2. OR End time is > current time (still running/en route)
                                                const startMinutes = timeToMinutes(item.loadingStartingTime);
                                                const isUpcoming = startMinutes >= currentMinutes;
                                                const isEnRoute = lastStopMinutes > currentMinutes;

                                                return isUpcoming || isEnRoute;
                                            });
                                            if (activeBuses.length === 0) {
                                                return (
                                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                                        <Text style={{ color: '#999' }}>No more upcoming buses for today.</Text>
                                                    </View>
                                                );
                                            }

                                            // Include live buses that might not be in the timetable (extras)
                                            const extraLiveBuses = liveBusData
                                                .filter(d =>
                                                    d.routePermitBus?.route?.routeNumber === selectedRouteData?.routeNumber &&
                                                    !activeBuses.some(s =>
                                                        (s.deviceId && d.id && s.deviceId === d.id) ||
                                                        (s.id && d.busTurnId && s.id === d.busTurnId) ||
                                                        (s.runningSlotId && d.runningSlotId && s.runningSlotId === d.runningSlotId)
                                                    )
                                                )
                                                .map(d => ({
                                                    id: `extra-${d.id}`,
                                                    deviceId: d.id,
                                                    busTurnStatus: "running",
                                                    isOnline: true,
                                                    loadingStartingTime: "0000", // Will be sorted or handled
                                                    isExtra: true,
                                                    runningSlotBusStops: [],
                                                }));

                                            const allVisibleBuses = [...activeBuses, ...extraLiveBuses];

                                            const sortedBuses = [...allVisibleBuses].sort((a, b) =>
                                                timeToMinutes(a.loadingStartingTime) - timeToMinutes(b.loadingStartingTime)
                                            );

                                            const mostRecentIndex = sortedBuses.findIndex(item =>
                                                timeToMinutes(item.loadingStartingTime) >= currentMinutes
                                            );

                                            return sortedBuses.map((item, idx) => {
                                                const isHighlighted = idx === mostRecentIndex;
                                                const stops = item.runningSlotBusStops || item.runningSlot?.runningSlotBusStops || [];
                                                const liveDevice = liveBusData.find(d => {
                                                    const matchById = item.deviceId && d.id && d.id === item.deviceId;
                                                    const matchByTurnId = item.id && d.busTurnId && d.busTurnId === item.id;
                                                    const matchBySlotId = item.runningSlotId && d.runningSlotId && d.runningSlotId === item.runningSlotId;

                                                    // For deviceId matches, only link if this turn is the active one (running/joined) 
                                                    // or if it's the closest turn by time.
                                                    if (matchById && !matchByTurnId && !matchBySlotId) {
                                                        const startMins = timeToMinutes(item.loadingStartingTime);
                                                        const isTimeRelevant = Math.abs(currentMinutes - startMins) < 120; // Within 2 hours
                                                        return isTimeRelevant && (item.busTurnStatus === "running" || item.busTurnStatus === "joined_to_route" || isHighlighted);
                                                    }

                                                    return matchByTurnId || matchBySlotId || matchById;
                                                });
                                                const isOnlineLive = liveDevice ? liveDevice.isOnline : item.isOnline;
                                                const effectiveStatus = (isOnlineLive && (item.busTurnStatus === "pending" || !item.busTurnStatus)) ? "running" : (item.busTurnStatus || "pending");
                                                const deviceIdFallback = item.deviceId ? item.deviceId.substring(0, 7) : "---";
                                                const plateNumber = (liveDevice?.routePermitBus?.busNumber) || deviceIdFallback;
                                                const duration = calculateDuration(stops[0]?.weekdayTime, stops[stops.length - 1]?.weekdayTime);

                                                return (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[styles.busItem, isHighlighted && styles.highlightedBusItem]}
                                                        onPress={() => setSelectedResult(item)}
                                                    >
                                                        <View style={styles.busItemHeader}>
                                                            <View style={styles.busItemLeft}>
                                                                <Ionicons name="bus" size={22} color={isHighlighted ? "#b20a37" : "#333"} />
                                                                <View style={styles.busBadgeContainer}>
                                                                    {plateNumber !== "---" && (
                                                                        <View style={styles.blueBadge}>
                                                                            <Text style={styles.badgeText}>{plateNumber}</Text>
                                                                        </View>
                                                                    )}
                                                                    <View style={[styles.blueBadge, { backgroundColor: getStatusColor(effectiveStatus) }]}>
                                                                        <Text style={styles.badgeText}>{item.isExtra ? "Real-time" : effectiveStatus.replace(/_/g, ' ')}</Text>
                                                                    </View>
                                                                    {isOnlineLive && <View style={styles.statusDot} />}
                                                                </View>
                                                            </View>
                                                            <View style={styles.busItemRight}>
                                                                <Text style={[styles.durationTextContent, isHighlighted && { color: "#b20a37" }]}>
                                                                    {duration}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.busRouteDetails}>
                                                            <Text style={styles.routeTimes}>
                                                                {item.isExtra ? (
                                                                    <Text style={{ fontStyle: 'italic', color: '#666' }}>Real-time tracked bus (Not in timetable)</Text>
                                                                ) : (
                                                                    <><Text style={styles.boldCity}>{stops[0]?.busStop?.name || "---"}</Text> {formatTime(stops[0]?.weekdayTime)} - <Text style={styles.boldCity}>{stops[stops.length - 1]?.busStop?.name || "---"}</Text> {formatTime(stops[stops.length - 1]?.weekdayTime)}</>
                                                                )}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.itemDivider} />
                                                    </TouchableOpacity>
                                                );
                                            });
                                        })()
                                    )}
                                </ScrollView>
                            ) : (
                                <ScrollView style={styles.expandedScroll} showsVerticalScrollIndicator={false}>
                                    <View style={styles.expandedContainer}>
                                        {(() => {
                                            const liveDevice = liveBusData.find(d =>
                                                (selectedResult.deviceId && d.id && d.id === selectedResult.deviceId) ||
                                                (selectedResult.id && d.busTurnId && d.busTurnId === selectedResult.id) ||
                                                (selectedResult.runningSlotId && d.runningSlotId && d.runningSlotId === selectedResult.runningSlotId)
                                            );
                                            const plateNumber = liveDevice?.routePermitBus?.busNumber || (selectedResult.deviceId ? selectedResult.deviceId.substring(0, 7) : "---");
                                            const isOnlineLive = liveDevice ? liveDevice.isOnline : selectedResult.isOnline;
                                            const effectiveStatus = (isOnlineLive && (selectedResult.busTurnStatus === "pending" || !selectedResult.busTurnStatus)) ? "running" : (selectedResult.busTurnStatus || "pending");

                                            let sStops = selectedResult.runningSlotBusStops || selectedResult.runningSlot?.runningSlotBusStops || [];

                                            // Fallback: If no stops but we have route metadata, show route terminals
                                            if (sStops.length === 0 && selectedRouteData) {
                                                sStops = [
                                                    { id: 'start-term', busStop: selectedRouteData.start, weekdayTime: selectedResult.loadingStartingTime },
                                                    { id: 'end-term', busStop: selectedRouteData.end, weekdayTime: selectedResult.arrivalTime || selectedResult.loadingStartingTime }
                                                ];
                                            } else if (sStops.length === 1 && selectedRouteData) {
                                                // If only one stop (like the image showed), append the end terminal
                                                sStops = [...sStops, { id: 'end-term', busStop: selectedRouteData.end, weekdayTime: "---" }];
                                            }

                                            let nearestIndex = -1;
                                            let minDistance = 1;
                                            let busPositionPercent = 0;
                                            let busSegmentIndex = -1;

                                            // Find nearest stop and calculate position
                                            sStops.forEach((stop, idx) => {
                                                const dist = getDistance(
                                                    liveDevice?.lat,
                                                    liveDevice?.lon,
                                                    parseFloat(stop.busStop?.latitude || 0),
                                                    parseFloat(stop.busStop?.longitude || 0)
                                                );
                                                if (dist < minDistance) {
                                                    minDistance = dist;
                                                    nearestIndex = idx;
                                                }
                                            });

                                            // Calculate bus position between stops if online
                                            if (liveDevice && isOnlineLive && nearestIndex >= 0 && nearestIndex < sStops.length - 1) {
                                                const currentStop = sStops[nearestIndex];
                                                const nextStop = sStops[nearestIndex + 1];

                                                const currentLat = parseFloat(currentStop.busStop?.latitude || 0);
                                                const currentLon = parseFloat(currentStop.busStop?.longitude || 0);
                                                const nextLat = parseFloat(nextStop.busStop?.latitude || 0);
                                                const nextLon = parseFloat(nextStop.busStop?.longitude || 0);

                                                const totalDistance = getDistance(currentLat, currentLon, nextLat, nextLon);
                                                const distanceFromCurrent = getDistance(
                                                    liveDevice.lat,
                                                    liveDevice.lon,
                                                    currentLat,
                                                    currentLon
                                                );

                                                if (totalDistance > 0) {
                                                    busPositionPercent = Math.min(distanceFromCurrent / totalDistance, 1);
                                                    busSegmentIndex = nearestIndex;
                                                }
                                            }

                                            return (
                                                <>
                                                    <View style={styles.expandedHeader}>
                                                        <Ionicons name="bus" size={24} color="#333" />
                                                        <View style={[styles.deviceIndicatorLarge, { backgroundColor: isOnlineLive ? "#4CD964" : "#999", marginLeft: 8 }]}>
                                                            <MaterialCommunityIcons name="chip" size={16} color="#fff" />
                                                        </View>
                                                        {plateNumber !== "---" && (
                                                            <View style={styles.blueBadgeLarge}>
                                                                <Text style={styles.badgeTextLarge}>{plateNumber}</Text>
                                                            </View>
                                                        )}
                                                        <View style={[styles.blueBadgeLarge, { backgroundColor: getStatusColor(effectiveStatus) }]}>
                                                            <Text style={styles.badgeTextLarge}>{effectiveStatus.replace(/_/g, ' ')}</Text>
                                                        </View>
                                                        {isOnlineLive && <View style={styles.statusDotLarge} />}
                                                    </View>

                                                    {/* Trip Summary Header */}
                                                    <View style={styles.tripSummaryHeader}>
                                                        <Text style={styles.tripSummaryText}>
                                                            <Text style={styles.tripSummaryLabel}>From </Text>
                                                            {selectedRouteData?.start?.name || "Start"} {formatTime(selectedResult.loadingStartingTime)}
                                                            <Text style={styles.tripSummaryLabel}> To </Text>
                                                            {selectedRouteData?.end?.name || "End"} {formatTime(sStops[sStops.length - 1]?.weekdayTime || selectedResult.arrivalTime)}
                                                        </Text>
                                                    </View>

                                                    {/* Advanced Timeline Container */}
                                                    <View style={styles.advancedTimelineWrapper}>
                                                        {/* The Purple Vertical Track */}
                                                        <View style={styles.timelineVerticalTrack}>
                                                            {/* Moving Bus Icon Container */}
                                                            {isOnlineLive && busSegmentIndex !== -1 && (
                                                                <View style={[
                                                                    styles.timelineLiveBusCarrier,
                                                                    {
                                                                        top: `${((busSegmentIndex + busPositionPercent) / Math.max(sStops.length - 1, 1)) * 100}%`,
                                                                        marginTop: 8 // Adjust for dot centering
                                                                    }
                                                                ]}>
                                                                    <View style={styles.timelineLiveBusIconBox}>
                                                                        <Ionicons name="bus" size={12} color="#fff" />
                                                                    </View>
                                                                </View>
                                                            )}
                                                        </View>

                                                        {/* Timeline Items */}
                                                        <View style={styles.timelineItemsContainer}>
                                                            {sStops.map((stop, index) => {
                                                                const isPassed = nearestIndex !== -1 && index <= nearestIndex;
                                                                return (
                                                                    <View key={`stop-${index}-${stop.id}`} style={styles.advancedTimelineItem}>
                                                                        <View style={[
                                                                            styles.advancedTimelineDot,
                                                                            isPassed ? styles.advancedTimelineDotPassed : styles.advancedTimelineDotPending
                                                                        ]} />
                                                                        <View style={styles.advancedTimelineRight}>
                                                                            <Text style={styles.advancedStopText}>
                                                                                {formatTime(stop.weekdayTime)}  -  {stop.busStop?.name || stop.name || "Unknown Stop"}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>

                                                    {/* Bottom Status Info */}
                                                    <View style={styles.timelineFooter}>
                                                        <View style={styles.arrivalPill}>
                                                            <Text style={styles.arrivalPillText}>Arrives to you at</Text>
                                                            <Text style={styles.arrivalTimeValue}>
                                                                {selectedResult.arrivesAt || formatTime(selectedResult.loadingStartingTime)}
                                                            </Text>
                                                        </View>
                                                        {selectedResult.delayMin > 0 && (
                                                            <Text style={styles.delayText}>
                                                                Delayed {selectedResult.delayMin} min
                                                            </Text>
                                                        )}
                                                    </View>
                                                </>
                                            );
                                        })()}
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
            )
            }
            {/* Upload Overlay */}
            {isUploading && (
                <View style={styles.uploadOverlay}>
                    <View style={styles.uploadCard}>
                        <Text style={styles.uploadTitle}>Submitting...</Text>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
                        </View>
                        <Text style={styles.uploadPct}>{Math.round(uploadProgress * 100)}%</Text>
                        <ActivityIndicator style={{ marginTop: 10 }} color="#b20a37" />
                    </View>
                </View>
            )}

            {/* Bottom Navigation - Separate Section (Hidden when keyboard is active) */}
            {
                !showResults && !isKeyboardVisible && (
                    <View style={[styles.bottomNavContainer, { bottom: 20 + insets.bottom }]}>
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
                                onPress={() => {
                                    if (activeTab === "Search") {
                                        // Trigger animation again if already active
                                        sheetHeight.setValue(0);
                                        Animated.spring(sheetHeight, {
                                            toValue: 1,
                                            friction: 8,
                                            tension: 50,
                                            useNativeDriver: false,
                                        }).start();
                                    } else {
                                        setActiveTab("Search");
                                    }
                                }}
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
                )
            }

            {/* Complain Screen View */}
            {
                !showResults && activeTab === "Complain" && (
                    <View style={[
                        styles.bottomSheet,
                        styles.complainSheet,
                        { bottom: 92 + insets.bottom }
                    ]}>
                        <View style={styles.handleContainerResults}>
                            <View style={styles.handleBarResults} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.complainScrollContent}>
                            <View style={[styles.complainHeader, { marginBottom: 4 }]}>
                                <View style={[styles.brandContainerCenter, { marginBottom: 0 }]}>
                                    <Image
                                        source={require('../../assets/logo.png')}
                                        style={styles.mainLogo}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={[styles.complainTitle, { marginTop: -4 }]}>ADD A COMPLAINT</Text>
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
                                        Choose Files <Text style={{ color: "#999", fontWeight: "400" }}>{selectedFile?.name || (typeof selectedFile === 'string' ? selectedFile : "no files selected")}</Text>
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.attachmentSubtext}>Max total size 100 MB. Allowed: images or PDF.</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButtonLarge, { backgroundColor: "#ccc", shadowColor: "transparent", elevation: 0 }]}
                                activeOpacity={1}
                                disabled={true}
                            >
                                <Text style={styles.submitButtonText}>Submit Complaint</Text>
                            </TouchableOpacity>

                            <Text style={styles.termsText}>
                                By clicking continue, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>. Developed by <Text style={styles.linkText}>Aldtan</Text>.
                            </Text>

                            <Text style={styles.developerTextSmall}>
                                Developed By ALDTAN | ©2025 SPGPS. All rights reserved.
                            </Text>
                        </ScrollView>
                    </View>
                )
            }
            {/* Bottom Safe Area Panel (Professional background for system keys) */}
            {
                !isKeyboardVisible && (
                    <View
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: insets.bottom + 12,
                            backgroundColor: '#fff',
                            zIndex: 7, // Below sheets and nav bar
                        }}
                    />
                )
            }
            {/* Upload Progress Overlay */}
            {isUploading && (
                <View style={styles.uploadOverlay}>
                    <View style={styles.uploadCard}>
                        <Text style={styles.uploadTitle}>Uploading Complaint...</Text>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
                        </View>
                        <Text style={styles.uploadPct}>{Math.round(uploadProgress * 100)}%</Text>
                        <ActivityIndicator color="#b20a37" style={{ marginTop: 15 }} />
                    </View>
                </View>
            )}
        </View >
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
        height: 54,
        backgroundColor: "#fff",
        borderRadius: 27,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    topInput: {
        flex: 1,
        fontSize: 14,
        color: "#333",
        marginLeft: 12,
    },
    exampleTextTop: {
        fontSize: 12,
        color: "#999",
        marginRight: 8,
    },
    selectedBusNumberTop: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#b20a37",
        marginRight: 12,
    },
    topSuggestionsContainer: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 20,
        maxHeight: 300,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 15,
        padding: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    spBadge: {
        width: 36,
        height: 36,
        backgroundColor: "#b20a37",
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
        color: "#b20a37",
        marginRight: 12,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 50,
        left: 36,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 16,
        maxHeight: 250,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 100,
        padding: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#333',
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
        backgroundColor: "#b20a37",
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
    routeBadgeAttached: {
        position: "absolute",
        bottom: '100%',
        left: 0,
        marginBottom: 20,
        zIndex: 10,
    },
    onlineCountBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
        alignSelf: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#eee",
    },
    onlineCountText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#333",
        marginLeft: 6,
    },
    routeBadge: {
        backgroundColor: "#b20a37",
        paddingHorizontal: 20, // Increased horizontal padding
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
        bottom: 12,
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
        backgroundColor: "#b20a37",
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
        marginBottom: 12,
    },
    busItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
    },
    busItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    busBadgeContainer: {
        flexDirection: "row",
        gap: 4,
        flexWrap: "wrap",
        flex: 1,
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
    deviceIndicatorSmall: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    deviceIndicatorLarge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#4CD964",
        marginLeft: 6,
        borderWidth: 1.5,
        borderColor: "#fff",
        elevation: 2,
    },
    busItemRight: {
        alignItems: "flex-end",
        marginLeft: 8,
    },
    durationTextContent: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
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
        backgroundColor: "#f5f5f5",
        marginTop: 12,
    },
    highlightedBusItem: {
        backgroundColor: "#FFF9FA",
        borderRadius: 16,
        padding: 5,
        borderWidth: 1,
        borderColor: "#FFE4E9",
    },
    highlightBadge: {
        backgroundColor: "#b20a37",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    highlightBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "900",
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
        paddingTop: 4,
        paddingBottom: 40, // More room to scroll at the bottom
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
        marginTop: 16,
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: "row",
        minHeight: 50,
    },
    timelineLeft: {
        width: 30,
        alignItems: "center",
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#E0E0E0",
        zIndex: 2,
        marginTop: 4,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: "#E0E0E0",
        marginVertical: -2,
    },
    timelineBusIcon: {
        position: 'absolute',
        left: -7,
        width: 16,
        height: 16,
        backgroundColor: '#FFF',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FF6B35',
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 10,
    },
    timelineRight: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 20,
    },
    stopNameText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    tripSummaryHeader: {
        marginTop: 12,
        marginBottom: 20,
    },
    tripSummaryText: {
        fontSize: 16,
        color: "#1a1a1a",
        fontWeight: "500",
    },
    tripSummaryLabel: {
        fontWeight: "900",
    },
    advancedTimelineWrapper: {
        flexDirection: "row",
        paddingLeft: 4,
        minHeight: 120,
    },
    timelineVerticalTrack: {
        width: 12,
        backgroundColor: "#CBB6E5", // Light purple track
        borderRadius: 6,
        position: "relative",
        marginRight: 20,
    },
    timelineItemsContainer: {
        flex: 1,
        paddingTop: 4,
    },
    advancedTimelineItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        position: "relative",
    },
    advancedTimelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#fff",
        position: "absolute",
        left: -32, // Centered on the track
        zIndex: 2,
    },
    advancedTimelineDotPassed: {
        backgroundColor: "#A06ACB",
    },
    advancedTimelineDotPending: {
        backgroundColor: "#fff",
        borderColor: "#CBB6E5",
    },
    advancedTimelineRight: {
        flex: 1,
    },
    advancedStopText: {
        fontSize: 14,
        color: "#111",
        fontWeight: "700",
    },
    timelineLiveBusCarrier: {
        position: "absolute",
        left: -8,
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
    },
    timelineLiveBusIconBox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "#fff",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    timelineFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
        paddingTop: 10,
    },
    arrivalPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#A06ACB",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 999,
    },
    arrivalPillText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 14,
        marginRight: 10,
    },
    arrivalTimeValue: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 16,
    },
    delayText: {
        color: "#b20a37",
        fontWeight: "900",
        fontSize: 14,
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
        backgroundColor: "#b20a37",
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
        backgroundColor: "#b20a37",
        height: 54,
        borderRadius: 27,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 12,
        shadowColor: "#b20a37",
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
    stopMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderWidth: 1,
        borderColor: "#ccc",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    stopInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#666",
    },
    liveBusMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveBusMarkerInner: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#b20a37',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    liveBusMarkerPulse: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(196, 30, 58, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(196, 30, 58, 0.5)',
    },
    markerBadge: {
        position: "absolute",
        top: -45,
        backgroundColor: "rgba(0,0,0,0.8)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderColor: "rgba(255,255,255,0.3)",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
    },
    markerPlateText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },

    markerStatusText: {
        color: "#4CD964",
        fontSize: 10,
        fontWeight: "900",
    },
    markerSpeedText: {
        color: "#FFCC00",
        fontSize: 11,
        fontWeight: "bold",
    },

    /* Upload Overlay Styles */
    uploadOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        alignItems: "center",
        justifyContent: "center"
    },
    uploadCard: {
        width: "80%",
        backgroundColor: "white",
        borderRadius: 20,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    uploadTitle: {
        fontWeight: "900",
        fontSize: 18,
        color: "#111",
        marginBottom: 15
    },
    progressTrack: {
        width: "100%",
        height: 10,
        borderRadius: 5,
        backgroundColor: "#EAEAEA",
        overflow: "hidden"
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#b20a37"
    },
    uploadPct: {
        marginTop: 10,
        fontWeight: "900",
        color: "#b20a37",
        fontSize: 16
    },
});
