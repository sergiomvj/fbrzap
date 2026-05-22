import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { theme } from "../../src/theme/tokens";

type Message = {
  id: string;
  content: string;
  direction: "inbound_user" | "outbound_agent" | "system";
  status?: string;
  created_at: string;
};

// Generates a simple UUID-like string for client_message_id
function generateClientId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function ChatScreen(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
  const USER_ID = "595f98a5-b525-4a52-870b-14f036e6c71b"; // UUID fixo para teste local

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`${API_URL}/v1/chats/${chatId}/messages`, {
          headers: { "x-user-id": USER_ID }
        });
        const data = await response.json();
        
        if (data.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Erro ao buscar mensagens:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const clientId = generateClientId();
    const tempMessage: Message = {
      id: clientId,
      content: text,
      direction: "inbound_user",
      status: "processing",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputText("");
    setIsThinking(true);

    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": USER_ID
        },
        body: JSON.stringify({
          content: text,
          client_message_id: clientId,
          mentions: []
        })
      });

      const data = await response.json();
      
      if (data.ok && data.agent_reply) {
        setMessages((prev) => 
          prev.map(msg => msg.id === clientId ? { ...msg, status: "sent" } : msg)
          .concat(data.agent_reply)
        );
      } else if (!data.ok) {
        Alert.alert("Erro", "Falha ao enviar a mensagem.");
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      Alert.alert("Erro de Conexão", "Não foi possível enviar a mensagem ao agente.");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Chat",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.dark
        }}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={{ padding: 20, gap: 12 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <View 
                key={msg.id}
                style={{ 
                  alignSelf: msg.direction === "inbound_user" ? "flex-end" : "flex-start", 
                  maxWidth: "84%", 
                  backgroundColor: msg.direction === "inbound_user" ? theme.colors.surface : theme.colors.agentBubble, 
                  borderColor: msg.direction === "inbound_user" ? theme.colors.border : "transparent",
                  borderWidth: msg.direction === "inbound_user" ? 1 : 0, 
                  borderRadius: 22, 
                  padding: 14,
                  opacity: msg.status === "processing" ? 0.6 : 1
                }}
              >
                <Text style={theme.text.body}>{msg.content}</Text>
              </View>
            ))}
            
            {isThinking && (
              <Text style={[theme.text.bodyMuted, { alignSelf: "flex-start", marginTop: 8 }]}>Agente pensando...</Text>
            )}
          </ScrollView>
        )}
        
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Digite sua mensagem"
            placeholderTextColor={theme.colors.muted}
            onSubmitEditing={handleSend}
            editable={!isThinking}
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: theme.colors.dark,
              fontSize: 16
            }}
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!inputText.trim() || isThinking}
            style={{
              marginLeft: 12,
              backgroundColor: inputText.trim() && !isThinking ? theme.colors.primary : theme.colors.muted,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 18
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

