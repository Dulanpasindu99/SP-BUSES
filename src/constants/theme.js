import { Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");
const guidelineBaseWidth = 375;
export const scale = (size) => (W / guidelineBaseWidth) * size;

export const COLORS = {
  maroon: "#b20a37",
  lightPink: "#F4E1E5",
  lightPink2: "#F7E8EB",
  white: "#FFFFFF",
  text: "#222222",
  muted: "#8A8A8A",
};

export const DIMENSIONS = {
  width: W,
  height: H,
};
