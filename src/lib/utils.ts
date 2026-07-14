import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
export function formatMoney(n: number) {
  return INR.format(n);
}
export function formatDateRange(start: string, end: string) {
  const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const s = new Date(start + "T00:00:00Z").toLocaleDateString("en-US", fmt);
  const e = new Date(end + "T00:00:00Z").toLocaleDateString("en-US", fmt);
  return `${s} → ${e}`;
}

export function getCalendarMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(y, m + 1, 0).getDate();

  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    label: now.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null) {
  return !!value && UUID_REGEX.test(value);
}