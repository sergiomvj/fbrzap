import { ScrollView, Text, View } from "react-native";
import { theme } from "../../src/theme/tokens";

const agents = [
  { id: "bia", name: "Ana Beatriz Schultz", role: "Assistente Comercial" },
  { id: "tina", name: "Tina Brooks", role: "Operacoes e processos" }
];

export default function AgentsScreen(): JSX.Element {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={theme.text.h1}>Agentes</Text>
      <Text style={theme.text.bodyMuted}>Diretorio editorial para descobrir com quem falar sem confusao.</Text>

      {agents.map((agent) => (
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
          <Text style={theme.text.bodyMuted}>{agent.role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

