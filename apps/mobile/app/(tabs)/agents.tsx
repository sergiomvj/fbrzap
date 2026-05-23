import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, Alert, Image } from "react-native";
import { theme } from "../../src/theme/tokens";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

type Agent = {
  id: string;
  name: string;
  role: string;
  description?: string;
  avatar_url?: string;
};

export default function AgentsScreen(): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    async function fetchAgents() {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
        const response = await fetch(`${apiUrl}/v1/agents`);
        const data = await response.json();
        
        // Supondo que a API do OpenClaw/FBRzap retorne { agents: [...] } ou diretamente o array
        if (Array.isArray(data)) {
          setAgents(data);
        } else if (data.agents && Array.isArray(data.agents)) {
          setAgents(data.agents);
        } else if (data.data && Array.isArray(data.data)) {
          setAgents(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  async function handleStartChat(agent: Agent) {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
      
      // Criando (ou recuperando) chat com o agente
      if (!session) return;
      const response = await fetch(`${apiUrl}/v1/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: "dm_agent",
          agent_id: agent.id
        })
      });

      const data = await response.json();

      if (data.ok && data.chat && data.chat.id) {
        // Redireciona para a tela do chat
        router.push({
          pathname: "/chat/[chatId]",
          params: { chatId: data.chat.id, agentName: agent.name, agentAvatar: agent.avatar_url || "" }
        });
      } else {
        Alert.alert("Erro", "Não foi possível iniciar o chat.");
        console.error("Create chat error:", data);
      }
    } catch (error) {
      Alert.alert("Erro", "Erro de conexão ao iniciar chat.");
      console.error("Start chat exception:", error);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.h1}>Agentes</Text>
      <Text style={theme.text.bodyMuted}>Diretorio editorial para descobrir com quem falar sem confusao.</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : agents.length === 0 ? (
        <Text style={[theme.text.bodyMuted, { textAlign: 'center', marginTop: 40 }]}>Nenhum agente encontrado.</Text>
      ) : (
        agents.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            onPress={() => handleStartChat(agent)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.colors.border,
              gap: 16
            }}
          >
            {agent.avatar_url ? (
              <View style={{ width: 50, height: 50, borderRadius: 25, overflow: "hidden", backgroundColor: theme.colors.border }}>
                <Image source={{ uri: agent.avatar_url }} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
                  {agent.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={theme.text.kicker}>{agent.id}</Text>
              <Text style={theme.text.cardTitle}>{agent.name}</Text>
              <Text style={theme.text.bodyMuted}>{agent.role || agent.description || "Agente de IA"}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

