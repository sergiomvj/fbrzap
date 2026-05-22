import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { theme } from "../../src/theme/tokens";

type Agent = {
  id: string;
  name: string;
  role: string;
  description?: string;
};

export default function AgentsScreen(): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

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
          <View
            key={agent.id}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}
          >
            <Text style={theme.text.kicker}>{agent.id}</Text>
            <Text style={theme.text.cardTitle}>{agent.name}</Text>
            <Text style={theme.text.bodyMuted}>{agent.role || agent.description || "Agente de IA"}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

