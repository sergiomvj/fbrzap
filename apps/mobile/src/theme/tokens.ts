import { TextStyle } from "react-native";

const headingFont = "Outfit_600SemiBold";
const bodyFont = "Inter_400Regular";

export const theme = {
  colors: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    primary: "#F97316",
    primaryPressed: "#EA580C",
    dark: "#101622",
    border: "#E2E8F0",
    muted: "#64748B",
    agentBubble: "#FFF1E8"
  },
  text: {
    kicker: {
      fontFamily: headingFont,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: "#F97316"
    } satisfies TextStyle,
    h1: {
      fontFamily: headingFont,
      fontSize: 32,
      lineHeight: 38,
      color: "#101622"
    } satisfies TextStyle,
    body: {
      fontFamily: bodyFont,
      fontSize: 16,
      lineHeight: 24,
      color: "#0F172A"
    } satisfies TextStyle,
    bodyMuted: {
      fontFamily: bodyFont,
      fontSize: 15,
      lineHeight: 22,
      color: "#64748B"
    } satisfies TextStyle,
    badge: {
      fontFamily: headingFont,
      fontSize: 12,
      color: "#F97316",
      marginBottom: 8
    } satisfies TextStyle,
    cardTitle: {
      fontFamily: headingFont,
      fontSize: 20,
      lineHeight: 26,
      color: "#101622",
      marginBottom: 4
    } satisfies TextStyle,
    darkKicker: {
      fontFamily: headingFont,
      fontSize: 13,
      textTransform: "uppercase",
      color: "#FDBA74",
      marginBottom: 8
    } satisfies TextStyle,
    darkTitle: {
      fontFamily: headingFont,
      fontSize: 24,
      lineHeight: 30,
      color: "#FFFFFF",
      marginBottom: 6
    } satisfies TextStyle,
    darkBody: {
      fontFamily: bodyFont,
      fontSize: 15,
      lineHeight: 22,
      color: "#CBD5E1"
    } satisfies TextStyle
  }
};
