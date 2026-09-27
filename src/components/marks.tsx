import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import type { CardBrand } from "@/src/types";

const SIZES = { sm: 40, md: 52, lg: 72 } as const;

export function CardBrandMark({
  brand,
  size = "md",
}: {
  brand: CardBrand;
  size?: keyof typeof SIZES;
}) {
  const box = SIZES[size];
  const r = box * 0.28;

  const shell = (children: React.ReactNode, background: string) => (
    <Svg width={box} height={box} viewBox="0 0 48 48">
      <Rect x="0" y="0" width="48" height="48" rx={r * 1.7} fill={background} />
      {children}
    </Svg>
  );

  if (brand === "visa") {
    return shell(
      <>
        <Path
          d="M17.2 12.5h-4.6l-2.9 23h4.6l2.9-23z"
          fill="#FFFFFF"
          opacity={0.95}
        />
        <Path
          d="M31.6 22.1c0-5-4-7.4-7.5-7.4-4.1 0-7.4 3.5-7.4 8.4 0 3.7 2.1 5.5 4.3 6.3 1.1.4 1.6.7 1.6 1.4 0 .9-1 1.2-1.9 1.2-1.4 0-2.6-.5-2.6-.5l-.4 3.6c.9.4 2.4.7 4 .7 4.4 0 7.6-3.3 7.6-8.3 0-2.2-1-4.4-3-5.4-.9-.4-1.4-.6-1.4-1.2 0-.5.5-1.1 1.6-1.1 1.2 0 2.1.2 2.1.2l.4-3.1c-.6-.2-1.7-.4-2.9-.4z"
          fill="#FFFFFF"
          opacity={0.95}
        />
      </>,
      "#1A1F71",
    );
  }

  if (brand === "mastercard") {
    return shell(
      <>
        <Circle cx="20" cy="24" r="9" fill="#EB001B" />
        <Circle cx="28" cy="24" r="9" fill="#F79E1B" opacity={0.92} />
      </>,
      "#1B1B1B",
    );
  }

  if (brand === "amex") {
    return shell(
      <Path
        d="M9 32l4-16h5.2l1.7 7.4L21.7 16H27l4 16h-4.3l-1.9-8.6-2.6 8.6h-3.3l-1.7-6.3-1.6 6.3H9z"
        fill="#FFFFFF"
      />,
      "#2E77BC",
    );
  }

  if (brand === "paystack") {
    return shell(
      <Path
        d="M20 12h8c6 0 10 3.4 10 8.4S34 29 28 29h-4v7h-4V12zm4 3.6v9.8h4c3.4 0 5.4-1.9 5.4-4.9s-2-4.9-5.4-4.9h-4z"
        fill="#FFFFFF"
      />,
      "#0C2451",
    );
  }

  return shell(
    <>
      <Path
        d="M24 11l3.4 7.2 7.9 1-5.8 5.4 1.5 7.8L24 28.5l-7 3.9 1.5-7.8-5.8-5.4 7.9-1L24 11z"
        fill="#FFFFFF"
      />
    </>,
    "#0B7A3B",
  );
}

export function TransactionIcon({
  kind,
  category,
  size = 44,
}: {
  kind: string;
  category: string;
  size?: number;
}) {
  const icon = ICON_BY_CATEGORY[category] ?? ICON_BY_KIND[kind] ?? "ellipse-outline";
  return (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size / 3 },
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color="#22C55E" />
    </View>
  );
}

const ICON_BY_CATEGORY: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  food: "restaurant-outline",
  shopping: "bag-handle-outline",
  transport: "car-outline",
  utilities: "flash-outline",
  entertainment: "film-outline",
  health: "medkit-outline",
  salary: "arrow-down-circle-outline",
  transfer: "swap-horizontal-outline",
  investment: "trending-up-outline",
  other: "ellipse-outline",
};

const ICON_BY_KIND: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  card: "card-outline",
  deposit: "arrow-down-circle-outline",
  withdrawal: "arrow-up-circle-outline",
  dividend: "cash-outline",
  fee: "receipt-outline",
};

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.14)",
  },
});
