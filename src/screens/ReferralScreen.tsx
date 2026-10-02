import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Share, Text, View } from "react-native";

import { ProgressBar, StatStrip, StatTile } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  EmptyState,
  HeaderBar,
  ListCard,
  Screen,
  Section,
} from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { useCurrency } from "@/src/hooks/useCurrency";
import { formatDate, formatMoney, initials } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

const TIER_PERKS: Record<string, { invites: number; multiplier: number; label: string }> = {
  bronze: { invites: 1, multiplier: 1, label: "Bronze" },
  silver: { invites: 5, multiplier: 1.25, label: "Silver" },
  gold: { invites: 15, multiplier: 1.5, label: "Gold" },
};

const NEXT_TIER: Record<string, string | null> = {
  bronze: "silver",
  silver: "gold",
  gold: null,
};

export default function ReferralScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const referral = useBanking((s) => s.referral);
  const [busy, setBusy] = useState(false);

  const tier = TIER_PERKS[referral.tier] ?? TIER_PERKS.bronze;
  const next = NEXT_TIER[referral.tier] ?? null;
  const rewarded = referral.invited.filter((item) => item.status === "rewarded").length;
  const pending = referral.invited.filter((item) => item.status === "joined").length;

  const share = async () => {
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(referral.link);
        toast.success("Referral link copied.");
        return;
      }
      const { Share: RNShare } = await import("react-native");
      await RNShare.share({
        message: `Join me on INVETO and we'll both get ${formatMoney(referral.rewardPerReferral * tier.multiplier, currency)}. Use my link: ${referral.link}`,
        title: "Join INVETO",
      });
    } catch {
      toast.error("Could not open the share sheet.");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(referral.code);
        toast.success(`Code ${referral.code} copied.`);
      } catch {
        toast.error("Could not copy the code.");
      }
      return;
    }
    try {
      await Share.share({ message: referral.code, title: "Your referral code" });
    } catch {
      toast.error("Could not open the share sheet.");
    }
  };

  const progressToNext = next
    ? Math.min(referral.invited.length / (TIER_PERKS[next]?.invites ?? 1), 1)
    : 1;

  return (
    <Screen gap={24}>
      <HeaderBar title="Refer a friend" onBack={() => router.back()} />

      <Card style={{ padding: 22, gap: 18, alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 22,
            backgroundColor: colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="gift-outline" size={30} color={colors.accent} />
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
            Give {formatMoney(referral.rewardPerReferral * tier.multiplier, currency)}, get{" "}
            {formatMoney(referral.rewardPerReferral * tier.multiplier, currency)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            For you and your friend, once they add {formatMoney(50, currency)} and keep it for 30
            days.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: colors.accentSoft,
          }}
        >
          <Text
            selectable
            style={{ color: colors.accent, fontSize: 18, fontWeight: "800", letterSpacing: 1 }}
          >
            {referral.code}
          </Text>
        </View>

        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label="Share your link" size="lg" icon="share-outline" loading={busy} onPress={share} />
          <Button label="Copy code instead" variant="secondary" onPress={copyCode} />
        </View>
      </Card>

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Reward earned"
            value={formatMoney(referral.paidOut + referral.balance, currency, { compact: true })}
            tone="accent"
            hint={`${rewarded} rewarded`}
          />
          <StatTile
            label="Unpaid"
            value={formatMoney(referral.balance, currency, { compact: true })}
            hint="Paid monthly"
          />
          <StatTile
            label="Invited"
            value={`${referral.invited.length}`}
            hint={`${pending} still pending`}
          />
        </StatStrip>
      </Card>

      <Section title="Your tier" gap={14}>
        <Card style={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="ribbon-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                {tier.label} tier
              </Text>
              <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                {tier.multiplier}x rewards on every referral
              </Text>
            </View>
            <Chip label={`${referral.invited.length}/${tier.invites || "∞"}`} tone="accent" />
          </View>

          {next ? (
            <View style={{ gap: 8 }}>
              <ProgressBar value={progressToNext} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Invite {Math.max((TIER_PERKS[next]?.invites ?? 0) - referral.invited.length, 0)} more
                to reach {TIER_PERKS[next]?.label} and a{" "}
                {TIER_PERKS[next]?.multiplier}x multiplier.
              </Text>
            </View>
          ) : (
            <Banner
              tone="success"
              icon="trophy-outline"
              message="You are on the top tier. Every referral now pays 1.5x."
            />
          )}
        </Card>
      </Section>

      <Section title="How it works" gap={12}>
        <ListCard style={{ paddingHorizontal: 14 }}>
          {[
            { step: "1", title: "Share your link", body: "Send it to a friend however you like." },
            { step: "2", title: "They sign up", body: "They join and verify their identity." },
            { step: "3", title: "They add money", body: `They deposit ${formatMoney(50, currency)} and hold it for 30 days.` },
            { step: "4", title: "You both get paid", body: `${formatMoney(referral.rewardPerReferral * tier.multiplier, currency)} lands in each account on the 1st.` },
          ].map((item, index) => (
            <View key={item.step}>
              <View style={{ paddingVertical: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "800" }}>
                      {item.step}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                    {item.title}
                  </Text>
                </View>
                <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19, paddingLeft: 34 }}>
                  {item.body}
                </Text>
              </View>
              {index < 3 ? <Divider /> : null}
            </View>
          ))}
        </ListCard>
      </Section>

      <Section title="People you invited" gap={12}>
        {referral.invited.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No invites yet"
            message="Share your link to get started."
            action="Share now"
            onAction={share}
          />
        ) : (
          <ListCard style={{ paddingHorizontal: 14 }}>
            {referral.invited.map((person, index) => (
              <View key={person.id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 13,
                      backgroundColor: colors.surfaceRaised,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "800" }}>
                      {initials(person.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                      {person.name}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                      Joined {formatDate(person.joinedAt)}
                    </Text>
                  </View>
                  <InviteChip status={person.status} />
                </View>
                {index < referral.invited.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </ListCard>
        )}
      </Section>

      <Card style={{ padding: 16, gap: 10 }}>
        <DetailRow label="Reward per referral" value={formatMoney(referral.rewardPerReferral, currency)} />
        <DetailRow
          label="Your rate"
          value={formatMoney(referral.rewardPerReferral * tier.multiplier, currency)}
        />
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 18 }}>
          Rewards are paid on the 1st of each month for referrals that qualified in the previous
          month. There is no cap on how many people you can invite.
        </Text>
      </Card>
    </Screen>
  );
}

function InviteChip({ status }: { status: string }) {
  if (status === "rewarded") return <Chip label="Rewarded" tone="success" />;
  if (status === "funded") return <Chip label="Qualifying" tone="warning" />;
  return <Chip label="Joined" tone="neutral" />;
}
