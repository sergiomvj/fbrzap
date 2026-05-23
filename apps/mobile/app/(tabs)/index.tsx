import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { theme } from "../../src/theme/tokens";
import { useAuth } from "../../src/contexts/AuthContext";
import { useFocusEffect } from "expo-router";

type Chat = {
  id: string;
  type: string;
  title?: string;
  agent_id?: string;
  last_message_preview?: string;
  last_message_at?: string;
};

export default function ChatsScreen(): JSX.Element {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useFocusEffect(
    useCallback(() => {
      async function fetchChats() {
        if (!session) return;
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
          const response = await fetch(`${apiUrl}/v1/chats`, {
            headers: {
              "Authorization": `Bearer ${session.access_token}`
            }
          });
        const data = await response.json();
        
        if (data.ok && Array.isArray(data.chats)) {
          setChats(data.chats);
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchChats();
    }, [session])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.kicker}>FBRzap</Text>
      <Text style={theme.text.h1}>Inbox operacional</Text>
      <Text style={theme.text.bodyMuted}>
        Conversas com agentes, grupos e operacoes do time em uma unica trilha.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : chats.length === 0 ? (
        <Text style={[theme.text.bodyMuted, { textAlign: "center", marginVertical: 20 }]}>Nenhuma conversa encontrada.</Text>
      ) : (
        chats.map((chat) => (
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
              <Text style={theme.text.badge}>{chat.type === "dm_agent" ? "Agente" : "Grupo"}</Text>
              <Text style={theme.text.cardTitle}>{chat.type === "dm_agent" ? (chat.agent_id || "Agente FBRzap") : chat.title}</Text>
              <Text style={theme.text.bodyMuted} numberOfLines={1}>
                {chat.last_message_preview || "Nenhuma mensagem ainda..."}
              </Text>
            </Pressable>
          </Link>
        ))
      )}

      <View
        style={{
          backgroundColor: theme.colors.dark,
          borderRadius: 24,
          padding: 20,
          marginTop: 20
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

