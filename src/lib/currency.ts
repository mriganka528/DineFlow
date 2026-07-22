import CurrencyList from "currency-list";

export const DEFAULT_CURRENCY = "INR";

type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  decimal_digits: number;
};

// currency-list exposes either the class instance or a default export depending
// on the module interop, so normalise access here.
const list = (CurrencyList as unknown as { default?: typeof CurrencyList }).default ?? CurrencyList;

function getInfo(code: string): CurrencyInfo | null {
  try {
    const info = list.get(code) as CurrencyInfo | undefined;
    return info && info.code ? info : null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the given code is a currency supported by `currency-list`.
 */
export function isValidCurrency(code: string | null | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  return getInfo(code.toUpperCase()) !== null;
}

/**
 * Normalises a currency code to a valid, supported code, falling back to INR.
 */
export function normalizeCurrency(code: string | null | undefined): string {
  if (code && isValidCurrency(code)) return code.toUpperCase();
  return DEFAULT_CURRENCY;
}

export type CurrencyOption = { label: string; value: string };

let cachedOptions: CurrencyOption[] | null = null;

/**
 * Full list of supported currencies for a searchable dropdown, sorted by code.
 * Labels read like "INR — Indian Rupee".
 */
export function getCurrencyOptions(): CurrencyOption[] {
  if (cachedOptions) return cachedOptions;

  const all = list.getAll("en_US") as Record<string, CurrencyInfo>;

  cachedOptions = Object.values(all)
    .map((info) => ({
      value: info.code,
      label: `${info.code} — ${info.name}`,
    }))
    .sort((a, b) => a.value.localeCompare(b.value));

  return cachedOptions;
}

/**
 * Formats a monetary amount using the browser/runtime `Intl` currency data so
 * the correct symbol (e.g. ₹, $, €) and grouping are always used. Never hardcode
 * a currency symbol — always go through this helper.
 */
export function formatMoney(
  amount: number,
  currency: string | null | undefined = DEFAULT_CURRENCY,
  options?: { decimals?: number },
): string {
  const code = normalizeCurrency(currency);
  const value = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      ...(options?.decimals !== undefined
        ? { minimumFractionDigits: options.decimals, maximumFractionDigits: options.decimals }
        : {}),
    }).format(value);
  } catch {
    // Extremely defensive: unknown code slipped through — show the code prefix.
    const decimals = options?.decimals ?? 2;
    return `${code} ${value.toFixed(decimals)}`;
  }
}

/**
 * Returns just the currency symbol (e.g. ₹) for the given code.
 */
export function getCurrencySymbol(currency: string | null | undefined = DEFAULT_CURRENCY): string {
  const code = normalizeCurrency(currency);
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}
