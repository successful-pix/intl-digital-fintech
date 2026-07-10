export type Currency = "USD" | "CAD" | "VND" | "BRL";

export const CURRENCIES: Record<Currency, { symbol: string; label: string; locale: string; flag: string }> = {
  USD: { symbol: "$", label: "US Dollar", locale: "en-US", flag: "🇺🇸" },
  CAD: { symbol: "C$", label: "Canadian Dollar", locale: "en-CA", flag: "🇨🇦" },
  VND: { symbol: "₫", label: "Vietnamese Dong", locale: "vi-VN", flag: "🇻🇳" },
  BRL: { symbol: "R$", label: "Brazilian Real", locale: "pt-BR", flag: "🇧🇷" },
};

export function formatMoney(amount: number | string, currency: Currency): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const c = CURRENCIES[currency];
  const digits = currency === "VND" ? 0 : 2;
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(isNaN(n) ? 0 : n);
}
