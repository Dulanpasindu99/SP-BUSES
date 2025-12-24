export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.spgps.lk/api/public';

export const ENDPOINTS = {
    ROUTES: `${BASE_URL}/routes`,
    LIVE_DEVICES: `${BASE_URL}/devices-for-live-map`,
    TIMETABLE: (id) => `${BASE_URL}/timetable/bus-turn-running-slots/${id}`,
    ROUTE_META: (id) => `${BASE_URL}/withMeta/${id}`,
    COMPLAINTS: `${BASE_URL}/complaint`,
    BUS_SEARCH: `${BASE_URL}/buses/search`,
};
