import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, Alert, TextInput } from "react-native";
import { theme } from "../../src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

type GroupDetails = {
  id: string;
  title: string;
  agent_id?: string;
};

export default function GroupDetailsScreen(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

  const { session } = useAuth();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://webserver1-fbrzap.ldm9ti.easypanel.host";

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
      fetchAgents();
    }, [chatId, session])
  );

  async function fetchAgents() {
    try {
      const response = await fetch(`${API_URL}/v1/agents`);
      const data = await response.json();
      if (data.ok && Array.isArray(data.agents)) {
        setAvailableAgents(data.agents);
      }
    } catch (error) {
      console.error("Failed to fetch agents", error);
    }
  }

  async function fetchGroupDetails() {
    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      
      if (data.ok && Array.isArray(data.chats)) {
        const found = data.chats.find((c: any) => c.id === chatId);
        if (found) {
          setGroup(found);
          setNewTitle(found.title);
        }
      }
    } catch (error) {
      console.error("Failed to fetch group:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAgent(agentId: string) {
    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ agent_id: agentId })
      });
      const data = await response.json();
      if (data.ok) {
        Alert.alert("Sucesso", "Agente adicionado ao grupo!");
        fetchGroupDetails();
      } else {
        Alert.alert("Erro", "Falha ao adicionar agente.");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro de conexão.");
    }
  }

  async function handleRemoveAgent(agentId: string) {
    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (data.ok) {
        Alert.alert("Sucesso", "Agente removido do grupo.");
        fetchGroupDetails();
      } else {
        Alert.alert("Erro", "Falha ao remover agente.");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro de conexão.");
    }
  }

  async function handleUpdateTitle() {
    if (!newTitle.trim() || !session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await response.json();
      if (data.ok) {
        Alert.alert("Sucesso", "Título do grupo atualizado.");
        fetchGroupDetails();
      } else {
        Alert.alert("Erro", "Falha ao atualizar título.");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro de conexão.");
    }
  }

  async function handleDeleteGroup() {
    Alert.alert(
      "Excluir Grupo",
      "Tem certeza que deseja apagar o grupo? Todas as mensagens serão perdidas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!session) return;
            try {
              const response = await fetch(`${API_URL}/v1/chats/${chatId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session.access_token}` }
              });
              const data = await response.json();
              if (data.ok) {
                Alert.alert("Excluído", "Grupo apagado com sucesso.");
                router.replace("/groups");
              } else {
                Alert.alert("Erro", "Falha ao excluir grupo.");
              }
            } catch (error) {
              Alert.alert("Erro", "Erro de conexão.");
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />;
  }

  const currentAgentIds = group?.agent_id ? group.agent_id.split(",").map(a => a.trim()).filter(Boolean) : [];
  const notInGroupAgents = availableAgents.filter(a => !currentAgentIds.includes(a.id));
  const inGroupAgents = availableAgents.filter(a => currentAgentIds.includes(a.id));

  return (
    <>
      <Stack.Screen options={{ title: "Detalhes do Grupo", headerStyle: { backgroundColor: theme.colors.surface } }} />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 20 }}>
        
        <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={theme.text.kicker}>TÍTULO DO GRUPO</Text>
          <View style={{ flexDirection: "row", marginTop: 8, gap: 10 }}>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              style={{ flex: 1, backgroundColor: theme.colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}
            />
            <TouchableOpacity onPress={handleUpdateTitle} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, justifyContent: "center", borderRadius: 12 }}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={theme.text.kicker}>AGENTES NO GRUPO</Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {inGroupAgents.map(agent => (
              <View 
                key={agent.id}
                style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: 12,
                  backgroundColor: theme.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.primary
                }}
              >
                <Text style={{ color: theme.colors.dark, fontWeight: "500" }}>{agent.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveAgent(agent.id)} style={{ padding: 6, backgroundColor: "#fee2e2", borderRadius: 8 }}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {inGroupAgents.length === 0 && (
              <Text style={theme.text.bodyMuted}>Nenhum agente participando deste grupo no momento.</Text>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={theme.text.kicker}>ADICIONAR NOVO AGENTE</Text>
          <Text style={[theme.text.bodyMuted, { marginBottom: 12 }]}>Selecione um agente para convidar.</Text>
          <View style={{ gap: 10 }}>
            {notInGroupAgents.map(agent => (
              <TouchableOpacity 
                key={agent.id}
                onPress={() => handleAddAgent(agent.id)}
                style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: 12,
                  backgroundColor: theme.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }}
              >
                <Text style={{ color: theme.colors.dark, fontWeight: "500" }}>{agent.name}</Text>
                <Ionicons name="person-add" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}
            {notInGroupAgents.length === 0 && (
              <Text style={theme.text.bodyMuted}>Todos os agentes disponíveis já estão no grupo.</Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleDeleteGroup}
          style={{ backgroundColor: "#ef4444", padding: 16, borderRadius: 16, alignItems: "center", marginTop: 20 }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Excluir Grupo</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}
