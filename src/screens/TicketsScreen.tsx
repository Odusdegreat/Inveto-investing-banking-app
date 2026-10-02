import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile, TextField } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  HeaderAction,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  SegmentedFilter,
  rowTextInset,
} from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { formatRelative } from "@/src/lib/format";
import { useBanking, type Ticket } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Filter = "open" | "awaiting-you" | "resolved";

const CATEGORIES: { key: Ticket["category"]; label: string; icon: string }[] = [
  { key: "transfers", label: "Transfers and payments", icon: "swap-horizontal-outline" },
  { key: "cards", label: "Cards", icon: "card-outline" },
  { key: "account", label: "Account and limits", icon: "wallet-outline" },
  { key: "investing", label: "Investing", icon: "trending-up-outline" },
  { key: "kyc", label: "Verification", icon: "shield-checkmark-outline" },
  { key: "other", label: "Something else", icon: "help-circle-outline" },
];

const STATUS_COPY: Record<Ticket["status"], { label: string; tone: "success" | "warning" | "accent" }> = {
  open: { label: "Open", tone: "accent" },
  "awaiting-you": { label: "Awaiting you", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
};

const QUICK = [
  "A payment says it failed but the money left my account",
  "I need to close my account",
  "My card was declined",
  "I cannot find a transaction on my statement",
  "Please help me raise my transfer limit",
];

export default function TicketsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const tickets = useBanking((s) => s.tickets);
  const addTicket = useBanking((s) => s.addTicket);
  const replyToTicket = useBanking((s) => s.replyToTicket);

  const [filter, setFilter] = useState<Filter>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Ticket["category"]>("transfers");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const open = tickets.find((item) => item.id === openId) ?? null;

  const visible = tickets.filter((item) => {
    if (filter === "open") return item.status === "open" || item.status === "awaiting-you";
    return item.status === filter;
  });

  const awaiting = tickets.filter((item) => item.status === "awaiting-you").length;
  const resolved = tickets.filter((item) => item.status === "resolved").length;
  const valid = subject.trim().length > 4;

  const create = () => {
    if (!valid) return;
    setBusy(true);
    setTimeout(() => {
      addTicket(subject.trim(), category);
      setBusy(false);
      setCreating(false);
      setSubject("");
    }, 700);
  };

  const send = () => {
    if (!open || reply.trim().length === 0) return;
    replyToTicket(open.id, reply.trim());
    setReply("");
    toast.success("Reply sent. We usually answer within a few hours.");
  };

  if (open) {
    return (
      <Screen gap={24}>
        <HeaderBar title={open.reference} onBack={() => setOpenId(null)} />

        <Card style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            {open.subject}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Chip label={STATUS_COPY[open.status].label} tone={STATUS_COPY[open.status].tone} />
            <Chip label={open.category} tone="neutral" />
            {open.priority === "high" ? <Chip label="High priority" tone="danger" /> : null}
            <Chip label={formatRelative(open.updatedAt)} tone="neutral" />
          </View>
        </Card>

        <Section title="Conversation" gap={12}>
          <View style={{ gap: 12 }}>
            {open.messages.map((message) => {
              const mine = message.from === "you";
              return (
                <View
                  key={message.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      borderBottomRightRadius: mine ? 6 : 18,
                      borderBottomLeftRadius: mine ? 18 : 6,
                      backgroundColor: mine ? colors.accentSoft : colors.surface,
                      borderWidth: 1,
                      borderColor: mine ? colors.accentBorder : colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>
                      {message.body}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSubtle,
                      fontSize: 11,
                      alignSelf: mine ? "flex-end" : "flex-start",
                    }}
                  >
                    {mine ? "You" : "INVETO support"} · {formatRelative(message.sentAt)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>

        {open.status === "resolved" ? (
          <Banner
            tone="success"
            icon="checkmark-circle"
            message="This ticket is closed. Reply to reopen it and we will pick it straight back up."
          />
        ) : null}

        <Section title="Reply" gap={12}>
          <TextField
            label="Add to this ticket"
            value={reply}
            onChangeText={setReply}
            placeholder="Type your message"
            multiline
            autoCapitalize="sentences"
          />
          <Button label="Send reply" disabled={reply.trim().length === 0} onPress={send} />
        </Section>
      </Screen>
    );
  }

  if (creating) {
    return (
      <Screen gap={24}>
        <HeaderBar title="New ticket" onBack={() => setCreating(false)} />

        <Section title="What is it about?" gap={12}>
          <View style={{ gap: 10 }}>
            {CATEGORIES.map((item) => (
              <ChoiceCard
                key={item.key}
                title={item.label}
                icon={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                selected={category === item.key}
                onPress={() => setCategory(item.key)}
              />
            ))}
          </View>
        </Section>

        <Section title="Describe the problem" gap={12}>
          <TextField
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="A short summary"
            autoCapitalize="sentences"
            error={subject.length > 4 ? null : "Add a little more detail."}
          />
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            Include dates, amounts and references if you have them. It helps us answer in one go
            rather than three.
          </Text>
        </Section>

        <Section title="Common questions" gap={10}>
          {QUICK.map((item) => (
            <Card key={item} style={{ padding: 14 }}>
              <Row title={item} onPress={() => setSubject(item)} />
            </Card>
          ))}
        </Section>

        <Button
          label={busy ? "Creating…" : "Create ticket"}
          size="lg"
          disabled={!valid}
          loading={busy}
          onPress={create}
        />
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar
        title="Support tickets"
        onBack={() => router.back()}
        right={<HeaderAction label="New" icon="add" onPress={() => setCreating(true)} />}
      />

      {awaiting ? (
        <Banner
          tone="warning"
          icon="chatbubbles-outline"
          message={`${awaiting} ticket${awaiting === 1 ? "" : "s"} need${awaiting === 1 ? "s" : ""} a reply from you.`}
        />
      ) : null}

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile label="Open" value={`${tickets.filter((t) => t.status !== "resolved").length}`} />
          <StatTile
            label="Awaiting you"
            value={`${awaiting}`}
            tone={awaiting ? "warning" : "default"}
          />
          <StatTile label="Resolved" value={`${resolved}`} tone="accent" />
        </StatStrip>
      </Card>

      <SegmentedFilter
        options={[
          { key: "open" as Filter, label: "Open" },
          { key: "awaiting-you" as Filter, label: "Awaiting you" },
          { key: "resolved" as Filter, label: "Resolved" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={filter === "resolved" ? "Nothing resolved yet" : "No open tickets"}
          message="Raise a ticket and we will get back to you, usually within a few hours."
          action="Raise a ticket"
          onAction={() => setCreating(true)}
        />
      ) : (
        <ListCard style={{ paddingHorizontal: 14 }}>
          {visible.map((ticket, index) => {
            const status = STATUS_COPY[ticket.status];
            return (
              <View key={ticket.id}>
                <View style={{ paddingVertical: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text
                      style={{ color: colors.textSubtle, fontSize: 12, fontWeight: "700" }}
                    >
                      {ticket.reference}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Chip label={status.label} tone={status.tone} />
                  </View>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }} numberOfLines={2}>
                    {ticket.subject}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, flex: 1 }}>
                      {ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"} ·
                      updated {formatRelative(ticket.updatedAt)}
                    </Text>
                    <Button label="Open" variant="secondary" onPress={() => setOpenId(ticket.id)} />
                  </View>
                </View>
                {index < visible.length - 1 ? <Divider /> : null}
              </View>
            );
          })}
        </ListCard>
      )}

      <Card style={{ padding: 16 }}>
        <Row
          title="Call or email us instead"
          subtitle="Mon to Fri, 8am to 6pm"
          icon="call-outline"
          chevron
          onPress={() => router.push("/helpsupport")}
        />
        <View style={{ height: 8 }} />
        <Row
          title="Read the help centre"
          subtitle="Answers to the most common questions"
          icon="help-circle-outline"
          chevron
          onPress={() => router.push("/helpsupport")}
        />
      </Card>

      <Card style={{ paddingHorizontal: 12 }}>
        <Row title="Report a fraudulent transaction" icon="warning-outline" danger chevron onPress={() => router.push("/transactions")} />
        <Divider inset={rowTextInset(20)} />
        <Row title="Freeze everything now" icon="snow-outline" chevron onPress={() => router.push("/securitysettings")} />
      </Card>
    </Screen>
  );
}
