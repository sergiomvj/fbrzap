import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, Alert, TextInput } from "react-native";
import { theme } from "../../src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type GroupDetails = {
  id: string;
  title: string;
  member_ids?: string[]; // Simplificando por enquanto
};

export default function GroupDetailsScreen(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
  const USER_ID = "595f98a5-b525-4a52-870b-14f036e6c71b";

  useEffect(() => {
    fetchGroupDetails();
    fetchAgents();
  }, [chatId]);

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
    try {
      const response = await fetch(`${API_URL}/v1/chats`, {
        headers: { "x-user-id": USER_ID }
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
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": USER_ID
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

  async function handleUpdateTitle() {
    if (!newTitle.trim()) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": USER_ID
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

  async function handleAddMember() {
    if (!newMemberId.trim()) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": USER_ID
        },
        body: JSON.stringify({ user_id: newMemberId })
      });
      const data = await response.json();
      if (data.ok) {
        Alert.alert("Sucesso", "Membro adicionado (fbrchat_id).");
        setNewMemberId("");
        fetchGroupDetails();
      } else {
        Alert.alert("Erro", "Falha ao adicionar membro.");
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
            try {
              const response = await fetch(`${API_URL}/v1/chats/${chatId}`, {
                method: "DELETE",
                headers: { "x-user-id": USER_ID }
              });
              const data = await response.json();
              if (data.ok) {
                router.replace("/(tabs)/groups");
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
          <Text style={theme.text.kicker}>ADICIONAR CONTATO (AGENTE)</Text>
          <Text style={[theme.text.bodyMuted, { marginBottom: 12 }]}>Selecione um agente da agenda para adicionar ao grupo.</Text>
          <View style={{ gap: 10 }}>
            {availableAgents.map(agent => (
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
            {availableAgents.length === 0 && (
              <Text style={theme.text.bodyMuted}>Nenhum agente disponível ou carregando...</Text>
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
