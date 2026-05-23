import { useEffect } from "react";
import { Stack, useRouter, useSegments, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Inter_400Regular, useFonts as useInterFonts } from "@expo-google-fonts/inter";
import { Outfit_600SemiBold, useFonts as useOutfitFonts } from "@expo-google-fonts/outfit";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Redirect away from login if authenticated
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  if (loading) {
    return null; // Or a splash screen
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[chatId]" options={{ headerShown: false }} />
        <Stack.Screen name="group-details/[chatId]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
