export default ({ config }) => ({
  ...config,
  name: "SP RPTA UI",
  slug: "sp-rpta-ui",
  scheme: "sprpta",
  android: {
    ...config.android,
    softwareKeyboardLayoutMode: "pan", // Only shift view if keyboard covers input
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
  },
  ios: {
    ...config.ios,
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
