import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { ProgressBar, StatStrip, StatTile } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  HeaderBar,
  ListCard,
  Screen,
  Section,
} from "@/src/components/ui";
import { formatDate, formatMoney } from "@/src/lib/format";
import { useBanking, type KycCheck } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

const TIERS = [
  {
    key: "tier-1" as const,
    name: "Tier 1",
    limit: 5000,
    summary: "Identity and address verified",
    perks: ["$5,000 a month in transfers", "Savings accounts", "Debit card"],
  },
  {
    key: "tier-2" as const,
    name: "Tier 2",
    limit: 25000,
    summary: "Source of funds verified",
    perks: ["$25,000 a month in transfers", "Fixed-term deposits", "International transfers"],
  },
  {
    key: "tier-3" as const,
    name: "Tier 3",
    limit: 100000,
    summary: "Enhanced due diligence",
    perks: ["$100,000 a month in transfers", "Credit products", "Relationship manager"],
  },
];

const STATUS_COPY: Record<KycCheck["status"], { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  verified: { label: "Verified", tone: "success" },
  "in-review": { label: "In review", tone: "warning" },
  "action-required": { label: "Action needed", tone: "danger" },
  "not-started": { label: "Not started", tone: "neutral" },
};

export default function KycScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const kyc = useBanking((s) => s.kyc);
  const submitKyc = useBanking((s) => s.submitKyc);

  const verified = kyc.checks.filter((check) => check.status === "verified").length;
  const inReview = kyc.checks.filter((check) => check.status === "in-review").length;
  const actionRequired = kyc.checks.filter((check) => check.status === "action-required");
  const progress = kyc.checks.length === 0 ? 0 : verified / kyc.checks.length;
  const currentTierIndex = TIERS.findIndex((tier) => tier.key === kyc.tier);

  return (
    <Screen gap={24}>
      <HeaderBar title="Verification" onBack={() => router.back()} />

      {actionRequired.length ? (
        <Banner
          tone="danger"
          icon="alert-circle"
          message={`${actionRequired.length} check${actionRequired.length === 1 ? " needs" : "s need"} your attention before we can finish verifying you.`}
        />
      ) : inReview ? (
        <Banner
          tone="info"
          icon="hourglass-outline"
          message={`${inReview} check${inReview === 1 ? " is" : "s are"} with our team. Most clear within one business day.`}
        />
      ) : (
        <Banner
          tone="success"
          icon="shield-checkmark"
          message="You are fully verified. Nothing is outstanding."
        />
      )}

      <Card style={{ padding: 20, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 20,
              backgroundColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>
              {TIERS[currentTierIndex]?.name ?? "Tier 1"}
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
              {kyc.verifiedAt ? `Verified ${formatDate(kyc.verifiedAt)}` : "Not verified yet"}
            </Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {verified} of {kyc.checks.length} checks complete
            </Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <ProgressBar value={progress} tone={progress === 1 ? "accent" : "warning"} height={10} />
        </View>

        <Divider />

        <StatStrip>
          <StatTile
            label="Monthly limit"
            value={formatMoney(kyc.monthlyLimit, "USD", { compact: true })}
            tone="accent"
            hint="Transfers out"
          />
          <StatTile
            label="In review"
            value={`${inReview}`}
            tone={inReview ? "warning" : "default"}
            hint="Checks"
          />
          <StatTile
            label="Outstanding"
            value={`${actionRequired.length}`}
            tone={actionRequired.length ? "danger" : "default"}
            hint="Need action"
          />
        </StatStrip>
      </Card>

      <Section title="Your checks" gap={12}>
        {kyc.checks.map((check) => {
          const status = STATUS_COPY[check.status];
          return (
            <Card key={check.id} style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    backgroundColor:
                      check.status === "verified"
                        ? colors.accentSoft
                        : check.status === "action-required"
                          ? colors.dangerSoft
                          : check.status === "in-review"
                            ? colors.warningSoft
                            : colors.surfaceRaised,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={check.icon as React.ComponentProps<typeof Ionicons>["name"]}
                    size={19}
                    color={
                      check.status === "verified"
                        ? colors.accent
                        : check.status === "action-required"
                          ? colors.danger
                          : check.status === "in-review"
                            ? colors.warning
                            : colors.textSubtle
                    }
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", flex: 1 }}>
                      {check.title}
                    </Text>
                    {check.required ? <Chip label="Required" tone="neutral" /> : null}
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
                    {check.description}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Chip label={status.label} tone={status.tone} />
                    {check.updatedAt ? (
                      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                        {formatDate(check.updatedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {check.status === "not-started" || check.status === "action-required" ? (
                <Button
                  label={check.status === "action-required" ? "Fix and resubmit" : "Start this check"}
                  variant={check.status === "action-required" ? "primary" : "secondary"}
                  onPress={() => submitKyc(check.id)}
                />
              ) : null}
            </Card>
          );
        })}
      </Section>

      <Section title="Verification tiers" gap={12}>
        {TIERS.map((tier, index) => {
          const current = index === currentTierIndex;
          const reached = index <= currentTierIndex;
          return (
            <Card
              key={tier.key}
              style={{
                padding: 16,
                gap: 12,
                borderColor: current ? colors.accent : colors.border,
                borderWidth: current ? 2 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons
                  name={reached ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={reached ? colors.accent : colors.textSubtle}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                      {tier.name}
                    </Text>
                    {current ? <Chip label="Your tier" tone="accent" /> : null}
                  </View>
                  <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{tier.summary}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>
                  {formatMoney(tier.limit, "USD", { compact: true })}
                </Text>
              </View>

              {reached ? (
                <View style={{ gap: 8, paddingLeft: 32 }}>
                  {tier.perks.map((perk) => (
                    <View key={perk} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="add" size={13} color={colors.accent} />
                      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{perk}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19, paddingLeft: 32 }}>
                  Complete the outstanding checks to unlock {tier.name}.
                </Text>
              )}
            </Card>
          );
        })}
      </Section>

      <Section title="Why we ask" gap={12}>
        <ListCard style={{ paddingHorizontal: 14 }}>
          <DetailRow label="Regulator" value="Deposit-taking licence" />
          <Divider />
          <DetailRow label="Checks we run" value="Identity, address, liveness" />
          <Divider />
          <DetailRow label="Typical time" value="Under 1 business day" />
          <Divider />
          <DetailRow label="Data retained" value="5 years after you leave" />
        </ListCard>
      </Section>

      <Banner
        tone="info"
        icon="lock-closed-outline"
        message="Verification documents are encrypted at rest and seen only by our compliance team. We never store a copy of your passport number in the app."
      />
    </Screen>
  );
}
