import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Inter_400Regular, useFonts as useInterFonts } from "@expo-google-fonts/inter";
import { Outfit_600SemiBold, useFonts as useOutfitFonts } from "@expo-google-fonts/outfit";

export default function RootLayout(): JSX.Element | null {
  const [interLoaded] = useInterFonts({
    Inter_400Regular
  });
  const [outfitLoaded] = useOutfitFonts({
    Outfit_600SemiBold
  });

  if (!interLoaded || !outfitLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false
        }}
      />
    </>
  );
}
