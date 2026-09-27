import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { api } from "@/src/api/client";
import type { CurrencyCode } from "@/src/types";
import { useApi } from "./useApi";

/**
 * The app's display currency. Lives in the database so the whole UI follows a
 * single setting, and falls back to the platform default before hydration.
 */
export function useCurrency() {
  const { data, reload } = useApi(() => api.preferences.get());

  return {
    currency: (data?.currency ?? DEFAULT_CURRENCY) as CurrencyCode,
    setCurrency: async (next: CurrencyCode) => {
      await api.preferences.updateCurrency(next);
      await reload();
    },
  };
}
