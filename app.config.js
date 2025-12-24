export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    eas: {
      projectId: "1de0c5af-3fec-4ef7-b293-ce0e1123e686",
    },
  },
  name: "SP BUS Live",
  icon: "./assets/icon.png",
  slug: "sp-rpta-ui",
  scheme: "sprpta",
  android: {
    ...config.android,
    package: "com.aldtan.sprpta",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#ffffff"
    },
    softwareKeyboardLayoutMode: "pan", // Only shift view if keyboard covers input
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "com.aldtan.sprpta",
    icon: "./assets/icon.png",
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  plugins: [
    [
      "expo-image-picker",
      {
        "photosPermission": "The app accesses your photos to let you attach images to complaints.",
        "cameraPermission": "The app accesses your camera to let you take photos for complaints."
      }
    ]
  ]
});
