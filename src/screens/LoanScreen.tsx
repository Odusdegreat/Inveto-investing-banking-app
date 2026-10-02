import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile, Stepper, TextField } from "@/src/components/insights";
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
  SegmentedFilter,
} from "@/src/components/ui";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatDate, formatMoney } from "@/src/lib/format";
import {
  monthlyPayment,
  totalRepayable,
  useBanking,
  type LoanApplication,
} from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Filter = "open" | "all";

const STATUS_COPY: Record<
  LoanApplication["status"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "accent" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "accent" },
  "under-review": { label: "Under review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  disbursed: { label: "Paid out", tone: "success" },
};

export default function LoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const products = useBanking((s) => s.loanProducts);
  const applications = useBanking((s) => s.loanApplications);
  const applyForLoan = useBanking((s) => s.applyForLoan);

  const [filter, setFilter] = useState<Filter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState(24);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const product = products.find((item) => item.id === selectedId) ?? null;

  const visible = applications.filter((item) =>
    filter === "all"
      ? true
      : item.status === "submitted" || item.status === "under-review" || item.status === "draft",
  );

  const openApplications = applications.filter(
    (item) => item.status === "submitted" || item.status === "under-review",
  );
  const outstanding = openApplications.reduce((sum, item) => sum + item.amount, 0);
  const cheapestApr = products.length
    ? products.reduce((min, item) => Math.min(min, item.apr), products[0].apr)
    : 0;

  const quote = useMemo(() => {
    if (!product) return null;
    const value = Number(amount) || product.minAmount;
    const payment = monthlyPayment(value, product.apr, Math.min(term, product.maxTermMonths));
    return {
      value,
      payment,
      total: totalRepayable(payment, Math.min(term, product.maxTermMonths)),
      term: Math.min(term, product.maxTermMonths),
    };
  }, [product, amount, term]);

  const amountInRange =
    !product ||
    ((Number(amount) || 0) >= product.minAmount && (Number(amount) || 0) <= product.maxAmount);

  const submit = () => {
    if (!product || !quote || !amountInRange) return;
    setBusy(true);
    setTimeout(() => {
      applyForLoan({
        productId: product.id,
        amount: quote.value,
        termMonths: quote.term,
        apr: product.apr,
        purpose,
      });
      setBusy(false);
      setSelectedId(null);
      setAmount("");
      setPurpose("");
      setTerm(24);
    }, 900);
  };

  if (product && quote) {
    return (
      <Screen gap={24}>
        <HeaderBar title="Your application" onBack={() => setSelectedId(null)} />

        <Card style={{ padding: 20, gap: 6, alignItems: "center" }}>
          <Chip
            label={product.collateralRequired ? "Secured" : "Unsecured"}
            tone="neutral"
          />
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
            {formatMoney(quote.value, currency)}
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 14 }}>
            over {quote.term} months at {product.apr === 0 ? "0%" : `${product.apr}%`} APR
          </Text>
        </Card>

        <Section title="How much it costs" gap={12}>
          <ListCard style={{ paddingHorizontal: 14 }}>
            <DetailRow
              label="Monthly payment"
              value={formatMoney(quote.payment, currency)}
              valueColor={colors.accent}
            />
            <Divider />
            <DetailRow label="Total repayable" value={formatMoney(quote.total, currency)} />
            <Divider />
            <DetailRow
              label="Total interest"
              value={formatMoney(Math.max(quote.total - quote.value, 0), currency)}
            />
            <Divider />
            <DetailRow label="APR" value={product.apr === 0 ? "0% (interest free)" : `${product.apr}%`} />
            <Divider />
            <DetailRow label="Arrangement fee" value="No fee" />
          </ListCard>
        </Section>

        <Section title="Adjust" gap={14}>
          <TextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder={String(product.minAmount)}
            keyboardType="decimal-pad"
            prefix={currencySymbol(currency)}
            helper={`Between ${formatMoney(product.minAmount, currency)} and ${formatMoney(product.maxAmount, currency)}.`}
            error={!amountInRange ? "That is outside the range for this product." : null}
          />
          {product.maxTermMonths > 1 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                Term: {Math.min(term, product.maxTermMonths)} months
              </Text>
              <Stepper
                value={Math.min(term, product.maxTermMonths)}
                onChange={setTerm}
                step={6}
                min={6}
                format={(value) => `${value} mo`}
              />
            </View>
          ) : null}
          <TextField
            label="What is it for? (optional)"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Helps us assess the application"
            autoCapitalize="sentences"
            multiline
          />
        </Section>

        <Card style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            By applying you confirm the information you have given is accurate, and you agree to a
            credit check. We will only pull your file once you accept the final offer.
          </Text>
          <Button
            label={busy ? "Submitting…" : "Submit application"}
            size="lg"
            loading={busy}
            disabled={!amountInRange}
            onPress={submit}
          />
        </Card>

        <Banner
          tone="warning"
          icon="warning-outline"
          message="Missed payments are recorded with the credit bureaus and can affect your ability to borrow in the future."
        />
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar title="Borrowing" onBack={() => router.back()} />

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Outstanding"
            value={formatMoney(outstanding, currency, { compact: true })}
            tone={outstanding > 0 ? "warning" : "default"}
            hint="Applications in progress"
          />
          <StatTile
            label="Applications"
            value={`${applications.length}`}
            hint="All time"
          />
          <StatTile
            label="Lowest APR"
            value={`${cheapestApr}%`}
            tone={cheapestApr === 0 ? "accent" : "default"}
            hint={cheapestApr === 0 ? "Interest free" : "Representative"}
          />
        </StatStrip>
      </Card>

      <Section title="What you can borrow" gap={12}>
        {products.map((item) => (
          <ChoiceCard
            key={item.id}
            title={item.name}
            subtitle={`${item.tagline} · up to ${formatMoney(item.maxAmount, currency, { compact: true })}`}
            icon={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
            selected={false}
            onPress={() => {
              setSelectedId(item.id);
              setTerm(Math.min(24, item.maxTermMonths));
            }}
            badge={item.popular ? "Most popular" : item.requiresVerification ? "Verification needed" : undefined}
          />
        ))}
      </Section>

      <Card style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="calculator-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
              How much could you get?
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
              Based on your income and existing commitments
            </Text>
          </View>
          <Text style={{ color: colors.accent, fontSize: 17, fontWeight: "800" }}>
            {formatMoney(18500, currency, { compact: true })}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          This is an estimate, not an approval. The amount we offer depends on a full affordability
          check and your verification tier.
        </Text>
      </Card>

      <SegmentedFilter
        options={[
          { key: "open" as Filter, label: "In progress" },
          { key: "all" as Filter, label: "All applications" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title={filter === "open" ? "No applications in progress" : "No applications yet"}
          message="Pick a product above to see what it would cost before you apply."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map((item) => (
            <ApplicationCard key={item.id} application={item} />
          ))}
        </View>
      )}

      <Banner
        tone="info"
        icon="shield-checkmark-outline"
        message="We are a regulated lender. We never charge for an application, and we will not ask for a fee to release funds."
      />
    </Screen>
  );
}

function ApplicationCard({ application }: { application: LoanApplication }) {
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const products = useBanking((s) => s.loanProducts);
  const product = products.find((item) => item.id === application.productId);
  const status = STATUS_COPY[application.status];

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: colors.surfaceRaised,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={(product?.icon ?? "cash-outline") as React.ComponentProps<typeof Ionicons>["name"]}
            size={19}
            color={colors.textMuted}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
            {product?.name ?? "Loan"}
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
            {application.reference} · {formatDate(application.createdAt)}
          </Text>
        </View>
        <Chip label={status.label} tone={status.tone} />
      </View>

      <ListCard style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
        <DetailRow label="Amount" value={formatMoney(application.amount, currency)} />
        <Divider />
        <DetailRow
          label="Monthly payment"
          value={formatMoney(application.monthlyPayment, currency)}
        />
        <Divider />
        <DetailRow label="Term" value={`${application.termMonths} months`} />
        {application.purpose ? (
          <>
            <Divider />
            <DetailRow label="Purpose" value={application.purpose} wide />
          </>
        ) : null}
      </ListCard>
    </Card>
  );
}
