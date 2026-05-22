import { ScrollView, Text, View } from "react-native";
import { theme } from "../../src/theme/tokens";

export default function ProfileScreen(): JSX.Element {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.h1}>Perfil</Text>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 22,
          padding: 18,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <Text style={theme.text.cardTitle}>Configuracao inicial</Text>
        <Text style={theme.text.bodyMuted}>Aqui entram organizacao, notificacoes e preferencias do operador.</Text>
      </View>
    </ScrollView>
  );
}

