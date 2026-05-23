import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { theme } from "../../src/theme/tokens";
import { StatusBar } from "expo-status-bar";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha e-mail e senha");
      return;
    }
    
    if (!supabase) {
      Alert.alert("Erro", "Cliente Supabase não configurado.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      Alert.alert("Falha no Login", error.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 32, color: theme.colors.primary, marginBottom: 8 }}>FBRzap</Text>
          <Text style={theme.text.bodyMuted}>Acesse o painel do operador</Text>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={[theme.text.kicker, { marginBottom: 8 }]}>E-MAIL</Text>
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                fontSize: 16,
                color: theme.colors.dark
              }}
              placeholder="seu@email.com"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text style={[theme.text.kicker, { marginBottom: 8 }]}>SENHA</Text>
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                fontSize: 16,
                color: theme.colors.dark
              }}
              placeholder="Sua senha secreta"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 10
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: "Outfit_600SemiBold", fontSize: 16 }}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
