import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "../../src/theme/tokens";

const chats = [
  { id: "bia-chat", title: "Ana Beatriz Schultz", subtitle: "Agente pensando...", type: "Agente" },
  { id: "grupo-comercial", title: "Time Comercial", subtitle: "@bia revisar a ultima campanha", type: "Grupo" }
];

export default function ChatsScreen(): JSX.Element {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.kicker}>FBRzap</Text>
      <Text style={theme.text.h1}>Inbox operacional</Text>
      <Text style={theme.text.bodyMuted}>
        Conversas com agentes, grupos e operacoes do time em uma unica trilha.
      </Text>

      {chats.map((chat) => (
        <Link key={chat.id} href={`/chat/${chat.id}`} asChild>
          <Pressable
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}
          >
            <Text style={theme.text.badge}>{chat.type}</Text>
            <Text style={theme.text.cardTitle}>{chat.title}</Text>
            <Text style={theme.text.bodyMuted}>{chat.subtitle}</Text>
          </Pressable>
        </Link>
      ))}

      <View
        style={{
          backgroundColor: theme.colors.dark,
          borderRadius: 24,
          padding: 20
        }}
      >
        <Text style={theme.text.darkKicker}>Pronto para producao</Text>
        <Text style={theme.text.darkTitle}>Mensageria premium com agentes Openclaw</Text>
        <Text style={theme.text.darkBody}>
          O app abre em chats, preserva o ritmo de conversa e evita a cara de catalogo generico.
        </Text>
      </View>
    </ScrollView>
  );
}

