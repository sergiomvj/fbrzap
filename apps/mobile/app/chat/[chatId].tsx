import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { theme } from "../../src/theme/tokens";

export default function ChatScreen(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: typeof chatId === "string" ? chatId : "Chat",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.dark
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <View style={{ alignSelf: "flex-end", maxWidth: "84%", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 22, padding: 14 }}>
            <Text style={theme.text.body}>Quero revisar a campanha desta semana.</Text>
          </View>
          <View style={{ alignSelf: "flex-start", maxWidth: "84%", backgroundColor: theme.colors.agentBubble, borderRadius: 22, padding: 14 }}>
            <Text style={theme.text.body}>Estou analisando agora. Vou estruturar em blocos para facilitar a aprovacao.</Text>
          </View>
          <Text style={theme.text.bodyMuted}>Agente pensando...</Text>
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <TextInput
            placeholder="Digite sua mensagem"
            placeholderTextColor={theme.colors.muted}
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: theme.colors.dark,
              fontSize: 16
            }}
          />
        </View>
      </View>
    </>
  );
}

