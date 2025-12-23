# SP RPTA React Native UI (Expo)

This is a UI prototype matching your screenshots:
- Home (map background + top search + chips + floating buttons + bottom route panel)
- Search Route (panel)
- Route Results (NO bottom nav, draggable results + expandable bus details)
- Complain (bus number suggestions + attachments JPG/PNG/PDF/Video <= 120MB + upload progress)

## 1) Install
```bash
npm install
```

## 2) Add Google Maps API key (safe way)
Create a file `.env`:
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```

## 3) Run
```bash
npm run start
```

Then press `i` for iOS simulator or `a` for Android emulator (or scan QR in Expo Go).

## Backend placeholders
In `App.js` > `ComplainScreen`, update:
- BUS_SEARCH_URL
- COMPLAINT_UPLOAD_URL
