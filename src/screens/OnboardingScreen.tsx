import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { Button, Card, Chip, Screen } from "@/src/components/ui";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Slide = {
  key: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: { label: string; detail: string }[];
  cta?: { label: string; href: string };
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    icon: "sparkles-outline",
    eyebrow: "Welcome to INVETO",
    title: "Banking that keeps up with you",
    body: "Open accounts, move money, invest and borrow without jumping between five different apps. Everything here is designed to be finished in seconds.",
    bullets: [
      { label: "Open an account in minutes", detail: "Savings, current or a fixed deposit" },
      { label: "Move money in two taps", detail: "Internal, external and scheduled transfers" },
      { label: "Invest and borrow in one place", detail: "Stocks, ETFs, savings loans and salary advances" },
    ],
  },
  {
    key: "money",
    icon: "wallet-outline",
    eyebrow: "Your money",
    title: "One balance view, no guesswork",
    body: "Every account, card and investment is on a single screen. Set budgets, build savings goals and get alerts before anything goes wrong.",
    cta: { label: "Set a budget", href: "/budgeting" },
  },
  {
    key: "cards",
    icon: "card-outline",
    eyebrow: "Cards",
    title: "A card that you can actually control",
    body: "Freeze and unfreeze instantly, set per-category and overall limits, and block the merchants you would rather avoid.",
    cta: { label: "Manage cards", href: "/cards" },
  },
  {
    key: "invest",
    icon: "trending-up-outline",
    eyebrow: "Investing",
    title: "Invest without the noise",
    body: "Buy fractional stakes in stocks and ETFs, then see allocation, yield and total cost in one analytics view.",
    cta: { label: "See my portfolio", href: "/portfolio-analytics" },
  },
  {
    key: "safety",
    icon: "shield-checkmark-outline",
    eyebrow: "Safety",
    title: "You are in control of your security",
    body: "Verify your identity once, set a PIN, turn on two-factor authentication and see every device that has touched your account.",
    cta: { label: "Check verification", href: "/verification" },
  },
  {
    key: "help",
    icon: "chatbubbles-outline",
    eyebrow: "Support",
    title: "Real help when you need it",
    body: "Raise a ticket, follow the conversation in the app, and get a human on the other end, usually within a few hours.",
    cta: { label: "Open a ticket", href: "/tickets" },
  },
];

const DOT_ICON = (name: string) => name as React.ComponentProps<typeof Ionicons>["name"];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { width } = useWindowDimensions();
  const onboarding = useBanking((s) => s.onboarding);
  const setOnboardingDismissed = useBanking((s) => s.setOnboardingDismissed);

  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const widthCap = Math.min(width, 560);
  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * widthCap, animated: true });
  };

  const next = () => {
    if (isLast) {
      setBusy(true);
      setTimeout(() => {
        setOnboardingDismissed(true);
        setBusy(false);
        setDone(true);
      }, 600);
      return;
    }
    goTo(index + 1);
  };

  const skip = () => {
    setOnboardingDismissed(true);
    router.replace("/");
  };

  const finish = () => router.replace("/");

  if (done || onboarding.completed) {
    return (
      <Screen gap={24} style={{ alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: 28,
            backgroundColor: colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={38} color={colors.accent} />
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
            You are all set
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            You can replay this walkthrough any time from advanced settings.
          </Text>
        </View>
        <Button label="Go to my accounts" size="lg" onPress={finish} />
        <Button
          label="Review the tour"
          variant="secondary"
          onPress={() => {
            setOnboardingDismissed(false);
            setDone(false);
            setIndex(0);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen gap={0} style={{ paddingHorizontal: 0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 22,
          paddingTop: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>INVETO</Text>
        </View>
        <Pressable
          onPress={skip}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Skip the tour"
        >
          <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "600" }}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, marginTop: 12 }}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / widthCap);
          if (nextIndex !== index) setIndex(nextIndex);
        }}
      >
        {SLIDES.map((item, slideIndex) => (
          <View
            key={item.key}
            style={{
              width: widthCap,
              alignSelf: "center",
              paddingHorizontal: 26,
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <View
              style={{
                width: 108,
                height: 108,
                borderRadius: 36,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={DOT_ICON(item.icon)} size={48} color={colors.accent} />
            </View>

            <Chip label={item.eyebrow} tone="accent" />

            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: "800",
                textAlign: "center",
                lineHeight: 32,
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: 23,
                textAlign: "center",
              }}
            >
              {item.body}
            </Text>

            {item.bullets ? (
              <Card style={{ padding: 18, gap: 14, alignSelf: "stretch" }}>
                {item.bullets.map((bullet, bulletIndex) => (
                  <View
                    key={bullet.label}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 9,
                        backgroundColor: colors.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "800" }}>
                        {bulletIndex + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                        {bullet.label}
                      </Text>
                      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{bullet.detail}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {item.cta ? (
              <Button
                label={item.cta.label}
                variant="secondary"
                icon="arrow-forward"
                onPress={() => router.push(item.cta!.href as never)}
              />
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={{ gap: 22, paddingHorizontal: 26, paddingBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            borderRadius: radii.pill,
          }}
        >
          {SLIDES.map((item, dotIndex) => (
            <Pressable
              key={item.key}
              onPress={() => goTo(dotIndex)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${dotIndex + 1}`}
              style={{
                width: dotIndex === index ? 22 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: dotIndex === index ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>

        <Button
          label={isLast ? (busy ? "Finishing…" : "Finish") : "Continue"}
          size="lg"
          loading={busy}
          onPress={next}
        />

        {!isLast ? (
          <Text style={{ color: colors.textSubtle, fontSize: 12, textAlign: "center" }}>
            You can replay the tour from advanced settings at any time.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
