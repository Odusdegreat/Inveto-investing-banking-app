import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { Card, HeaderBar, Screen, SectionHeader } from "@/src/components/ui";
import { useTheme } from "@/src/theme/ThemeProvider";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "What we collect",
    body: "Account identifiers, transaction history, device information, and the contact details you give us. We do not collect card numbers or CVVs — those are tokenised by our payment partners.",
  },
  {
    title: "How we use it",
    body: "To operate your accounts, detect fraud, provide support, and meet applicable data protection law requirements. We do not sell personal data.",
  },
  {
    title: "How we protect it",
    body: "Data is encrypted in transit and at rest. Sensitive actions require your PIN or biometric confirmation, and every session is revocable from the Devices screen.",
  },
  {
    title: "Your rights",
    body: "You can request a copy of your data, correct inaccuracies, or ask for deletion of accounts you have closed. Contact privacy@inveto.app.",
  },
];

export default function Privacy() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen>
      <HeaderBar title="Privacy" onBack={() => router.back()} />

      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
        INVETO is a demonstration build. This policy describes how the product is
        designed to handle your data.
      </Text>

      <View style={{ height: 20 }} />

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginBottom: 20 }}>
          <SectionHeader title={section.title} />
          <Card style={{ padding: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 21 }}>
              {section.body}
            </Text>
          </Card>
        </View>
      ))}
    </Screen>
  );
}
