import { ScrollView, Text, View } from "react-native";
import { theme } from "../../src/theme/tokens";

export default function ListsScreen(): JSX.Element {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.h1}>Listas</Text>
      <Text style={theme.text.bodyMuted}>
        Listas de distribuicao disparam mensagens individuais. Elas nao se comportam como grupo.
      </Text>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 22,
          padding: 18,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <Text style={theme.text.cardTitle}>Campanha SDR Maio</Text>
        <Text style={theme.text.bodyMuted}>256 contatos maximos por lista no v1.</Text>
      </View>
    </ScrollView>
  );
}

