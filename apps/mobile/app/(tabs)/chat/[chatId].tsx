import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../../../src/theme/tokens";
import { useAuth } from "../../../src/contexts/AuthContext";

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
  const { chatId, agentName, agentAvatar } = useLocalSearchParams<{ chatId: string; agentName: string; agentAvatar: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { session } = useAuth();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://webserver1-fbrzap.ldm9ti.easypanel.host";

  useEffect(() => {
    async function fetchMessages() {
      if (!session) return;
      try {
        const response = await fetch(`${API_URL}/v1/chats/${chatId}/messages`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
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

    if (!session) return;
    try {
      const response = await fetch(`${API_URL}/v1/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
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

  async function handleAttachImage() {
    setShowAttachMenu(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Você precisa permitir o acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      Alert.alert("Upload em andamento", "Simulando upload para Cloudflare R2...");
      
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || "image.jpg",
          type: asset.mimeType || "image/jpeg"
        } as any);

        const response = await fetch(`${API_URL}/v1/uploads`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${session?.access_token}` },
          body: formData,
        });

        const uploadData = await response.json();
        if (uploadData.ok && uploadData.url) {
           // Envia a mensagem pro agente com o anexo incluído
           const clientIdAttach = generateClientId();
           setMessages((prev) => [...prev, {
             id: clientIdAttach,
             content: "[Imagem Anexada]",
             direction: "inbound_user",
             status: "processing",
             created_at: new Date().toISOString(),
           }]);
           setIsThinking(true);

           const msgResponse = await fetch(`${API_URL}/v1/chats/${chatId}/messages`, {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${session?.access_token}`
             },
             body: JSON.stringify({
               content: "Segue imagem em anexo",
               client_message_id: clientIdAttach,
               mentions: [],
               attachments: [uploadData.url]
             })
           });

           const msgData = await msgResponse.json();
           if (msgData.ok && msgData.agent_reply) {
             setMessages((prev) => 
               prev.map(msg => msg.id === clientIdAttach ? { ...msg, status: "sent", content: "📷 Imagem enviada" } : msg)
               .concat(msgData.agent_reply)
             );
           } else {
             Alert.alert("Erro", "Falha ao enviar a mensagem com anexo.");
           }
        } else {
           Alert.alert("Erro no Upload", "Não foi possível salvar no R2.");
        }
      } catch (e) {
        Alert.alert("Erro", "Falha na comunicação de Upload.");
      } finally {
        setIsThinking(false);
      }
    }
  }

  function handleAttachAudio() {
    setShowAttachMenu(false);
    Alert.alert("Gravar Áudio", "Interface de gravação de áudio em breve.");
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12 }}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/agents")} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.dark} />
        </TouchableOpacity>
        
        {agentAvatar ? (
          <Image source={{ uri: agentAvatar }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.border }} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>{agentName ? agentName.charAt(0).toUpperCase() : "A"}</Text>
          </View>
        )}
        
        <View style={{ flex: 1 }}>
          <Text style={[theme.text.cardTitle, { marginBottom: 2 }]} numberOfLines={1}>{agentName || "Agente FBRzap"}</Text>
          <Text style={theme.text.bodyMuted} numberOfLines={1}>Agente IA</Text>
        </View>
      </View>
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
        
        {showAttachMenu && (
          <View style={{ position: "absolute", bottom: 85, left: 16, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5, zIndex: 10 }}>
            <TouchableOpacity onPress={handleAttachImage} style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 12 }}>
              <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
              <Text style={theme.text.body}>Galeria de Imagens</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAttachAudio} style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 12 }}>
              <Ionicons name="mic-outline" size={24} color={theme.colors.primary} />
              <Text style={theme.text.body}>Gravar Áudio</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setShowAttachMenu(!showAttachMenu)} style={{ padding: 10, marginRight: 4 }}>
            <Ionicons name="attach" size={28} color={theme.colors.muted} />
          </TouchableOpacity>
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
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

