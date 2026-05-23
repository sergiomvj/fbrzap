import { useEffect, useState, useCallback } from "react";
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, Alert, TextInput } from "react-native";
import { theme } from "../../src/theme/tokens";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";

type Chat = {
  id: string;
  type: string;
  title: string;
  memberIds?: string[];
};

export default function GroupsScreen(): JSX.Element {
  const [groups, setGroups] = useState<Chat[]>([]);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  const router = useRouter();
  const { session } = useAuth();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      fetchAgents();
    }, [session])
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

  async function fetchGroups() {
    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      
      if (data.ok && Array.isArray(data.chats)) {
        setGroups(data.chats.filter((c: Chat) => c.type === "group"));
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAgentSelection(agentId: string) {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  }

  async function handleCreateGroup() {
    if (!newTitle.trim()) {
      Alert.alert("Aviso", "O nome do grupo é obrigatório.");
      return;
    }

    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: "group",
          title: newTitle.trim(),
          member_ids: [],
          agent_ids: selectedAgents
        })
      });

      const data = await response.json();

      if (data.ok && data.chat) {
        setShowCreate(false);
        setNewTitle("");
        setSelectedAgents([]);
        fetchGroups(); // recarrega a lista
        router.push(`/chat/${data.chat.id}`);
      } else {
        Alert.alert("Erro", "Não foi possível criar o grupo.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha na conexão ao criar grupo.");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={theme.text.h1}>Grupos</Text>
          <Text style={theme.text.bodyMuted}>Gerencie seus grupos de agentes e operadores.</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowCreate(!showCreate)}
          style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginTop: 10 }}>
          <Text style={[theme.text.cardTitle, { marginBottom: 12 }]}>Criar Novo Grupo</Text>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Nome do grupo..."
            placeholderTextColor={theme.colors.muted}
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: 12,
              padding: 12,
              color: theme.colors.dark,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}
          />
          
          <Text style={[theme.text.kicker, { marginTop: 8, marginBottom: 8 }]}>SELECIONE OS AGENTES INICIAIS</Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {availableAgents.map(agent => (
              <TouchableOpacity
                key={agent.id}
                onPress={() => toggleAgentSelection(agent.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 10,
                  backgroundColor: theme.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedAgents.includes(agent.id) ? theme.colors.primary : theme.colors.border
                }}
              >
                <Text style={{ color: theme.colors.dark, fontWeight: "500" }}>{agent.name}</Text>
                {selectedAgents.includes(agent.id) && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            onPress={handleCreateGroup}
            style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar Grupo</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <Text style={[theme.text.bodyMuted, { textAlign: 'center', marginTop: 40 }]}>Nenhum grupo encontrado.</Text>
      ) : (
        groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            onPress={() => router.push(`/group-details/${group.id}`)}
            activeOpacity={0.7}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.colors.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <View>
              <Text style={theme.text.cardTitle}>{group.title}</Text>
              <Text style={theme.text.bodyMuted}>Grupo</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push(`/chat/${group.id}`)}
              style={{ padding: 10, backgroundColor: theme.colors.background, borderRadius: 12 }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>Chat</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
