import { useRouter } from "expo-router";
import React from "react";
import { Text } from "react-native";

import { Card, HeaderBar, Screen, Section } from "@/src/components/ui";
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
    <Screen gap={22}>
      <HeaderBar title="Privacy" onBack={() => router.back()} />

      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
        INVETO is a demonstration build. This policy describes how the product is
        designed to handle your data.
      </Text>

      {SECTIONS.map((section) => (
        <Section key={section.title} title={section.title} gap={12}>
          <Card style={{ padding: 20 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 23 }}>
              {section.body}
            </Text>
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
