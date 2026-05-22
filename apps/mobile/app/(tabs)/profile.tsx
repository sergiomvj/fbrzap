import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Alert, Image } from "react-native";
import { theme } from "../../src/theme/tokens";
import * as ImagePicker from "expo-image-picker";

type Profile = {
  id: string;
  display_name: string;
  avatar_url?: string;
  phone?: string;
};

export default function ProfileScreen(): JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3333";
  const USER_ID = "595f98a5-b525-4a52-870b-14f036e6c71b";

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch(`${API_URL}/v1/profiles/me`, {
        headers: { "x-user-id": USER_ID }
      });
      const data = await response.json();
      
      if (data.ok && data.profile) {
        setProfile(data.profile);
        setDisplayName(data.profile.display_name || "");
        setPhone(data.profile.phone || "");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      const response = await fetch(`${API_URL}/v1/profiles/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": USER_ID
        },
        body: JSON.stringify({
          display_name: displayName,
          phone: phone
        })
      });

      const data = await response.json();
      if (data.ok) {
        Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
        setProfile(data.profile);
      } else {
        Alert.alert("Erro", "Não foi possível atualizar o perfil.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão.");
    }
  }

  async function handleChangeAvatar() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Você precisa permitir o acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      Alert.alert("Upload", "Enviando avatar...");
      
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || "avatar.jpg",
          type: asset.mimeType || "image/jpeg"
        } as any);

        // Envia para o R2 via backend
        const uploadRes = await fetch(`${API_URL}/v1/uploads`, {
          method: "POST",
          headers: { "x-user-id": USER_ID },
          body: formData
        });

        const uploadData = await uploadRes.json();

        if (uploadData.ok && uploadData.url) {
          // Salva a URL no perfil
          const patchRes = await fetch(`${API_URL}/v1/profiles/me`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": USER_ID
            },
            body: JSON.stringify({ avatar_url: uploadData.url })
          });
          
          const patchData = await patchRes.json();
          if (patchData.ok) {
            setProfile(patchData.profile);
            Alert.alert("Sucesso", "Avatar atualizado!");
          }
        } else {
          Alert.alert("Erro", "Falha no upload da imagem.");
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Falha ao enviar arquivo.");
      }
    }
  }

  if (loading) {
    return <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 20 }}>
      <Text style={theme.text.h1}>Perfil</Text>

      <View style={{ alignItems: "center", marginBottom: 10 }}>
        <TouchableOpacity onPress={handleChangeAvatar} style={{ position: "relative" }}>
          <Image 
            source={{ uri: profile?.avatar_url || "https://i.pravatar.cc/150" }} 
            style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.border }} 
          />
          <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: theme.colors.primary, padding: 6, borderRadius: 12 }}>
            <Text style={{ color: "#fff", fontSize: 10 }}>Editar</Text>
          </View>
        </TouchableOpacity>
        <Text style={[theme.text.kicker, { marginTop: 10 }]}>{USER_ID}</Text>
      </View>

      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: theme.colors.border, gap: 12 }}>
        <Text style={theme.text.cardTitle}>Dados do Operador</Text>
        
        <View>
          <Text style={[theme.text.kicker, { marginBottom: 6 }]}>Nome de Exibição</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Seu nome..."
            style={{ backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.dark }}
          />
        </View>

        <View>
          <Text style={[theme.text.kicker, { marginBottom: 6 }]}>Telefone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+55..."
            keyboardType="phone-pad"
            style={{ backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.dark }}
          />
        </View>

        <TouchableOpacity onPress={handleSaveProfile} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar Alterações</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
