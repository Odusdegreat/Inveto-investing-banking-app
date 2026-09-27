import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";

import {
  Card,
  Divider,
  HeaderBar,
  Screen,
  SectionHeader,
} from "@/src/components/ui";
import { useTheme } from "@/src/theme/ThemeProvider";

const FAQS = [
  {
    q: "How long does a transfer take?",
    a: "Transfers to other INVETO users settle instantly. Bank transfers usually clear within one business day, and card payments show up straight away but settle in about three.",
  },
  {
    q: "Why is my card frozen?",
    a: "A card is frozen when we spot activity that does not match your normal pattern, or when you freeze it yourself from Payment methods. Unfreezing is instant and nothing is lost while it is frozen.",
  },
  {
    q: "What happens if I forget my PIN?",
    a: "Your PIN confirms sensitive actions such as sending money and changing your security settings. It is not used to sign in. If you forget it, sign in with your password or biometrics, then reset the PIN from Security settings. Support can also reset it once they have verified your identity.",
  },
  {
    q: "What needs my PIN?",
    a: "Sending money, buying or selling investments, changing your PIN or password, adding a payee, and turning off two-factor authentication or biometric unlock. Turning a security setting ON never needs it.",
  },
  {
    q: "Are my card details stored on the phone?",
    a: "No. Only the brand, last four digits, expiry, and a nickname are kept. The full number never touches this device.",
  },
  {
    q: "Can I invest and still use my current balance?",
    a: "Yes. Investing moves money from your investment wallet. Anything you leave in your main wallet stays available for transfers and bills.",
  },
  {
    q: "What are the transfer fees?",
    a: "0.75% per transfer, with a minimum fee and a maximum cap. The exact fee is always shown before you confirm.",
  },
];

const CONTACTS = [
  {
    label: "Call us",
    value: "+1 555 010 9000",
    hint: "Mon–Fri, 8am–6pm",
    icon: "call-outline" as const,
    href: "tel:+15550109000",
  },
  {
    label: "Email",
    value: "support@inveto.app",
    hint: "Replies within one business day",
    icon: "mail-outline" as const,
    href: "mailto:support@inveto.app",
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Screen>
      <HeaderBar title="Help & support" onBack={() => router.back()} />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search help articles"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="Search help articles"
        autoCorrect={false}
        style={{
          minHeight: 46,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 14,
          fontSize: 15,
        }}
      />

      <View style={{ height: 22 }} />

      <SectionHeader title="Contact us" />
      <Card style={{ paddingVertical: 4 }}>
        {CONTACTS.map((contact, index) => (
          <View key={contact.label}>
            <Pressable
              onPress={() => void Linking.openURL(contact.href)}
              accessibilityRole="button"
              accessibilityLabel={`${contact.label}: ${contact.value}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                backgroundColor: pressed ? colors.surfaceRaised : "transparent",
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accentSoft,
                }}
              >
                <Ionicons name={contact.icon} size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {contact.value}
                </Text>
                <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                  {contact.hint}
                </Text>
              </View>
              <Ionicons name="open-outline" size={15} color={colors.textSubtle} />
            </Pressable>
            {index < CONTACTS.length - 1 ? <Divider inset={64} /> : null}
          </View>
        ))}
      </Card>

      <View style={{ height: 22 }} />

      <SectionHeader
        title={query ? `${results.length} results` : "Common questions"}
      />

      {results.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {results.map((item, index) => {
            const expanded = open === item.q;
            return (
              <View key={item.q}>
                <Pressable
                  onPress={() => setOpen(expanded ? null : item.q)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={item.q}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                  })}
                >
                  <Text
                    style={{ color: colors.text, fontSize: 14, fontWeight: "600", flex: 1 }}
                  >
                    {item.q}
                  </Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={17}
                    color={colors.textSubtle}
                  />
                </Pressable>
                {expanded ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 13,
                      lineHeight: 21,
                      paddingHorizontal: 14,
                      paddingBottom: 14,
                    }}
                  >
                    {item.a}
                  </Text>
                ) : null}
                {index < results.length - 1 ? <Divider inset={14} /> : null}
              </View>
            );
          })}
        </Card>
      ) : (
        <Card style={{ padding: 20, alignItems: "center", gap: 8 }}>
          <Ionicons name="search-outline" size={22} color={colors.textSubtle} />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            No articles match “{query}”.
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
            Try a different word, or contact support above.
          </Text>
        </Card>
      )}

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 18,
          marginTop: 24,
        }}
      >
        INVETO is a regulated deposit-taking institution. Deposits are insured up
        to the statutory limit.
      </Text>
    </Screen>
  );
}
