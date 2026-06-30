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
  return {
    start: new Date(y, m, 1).toISOString().slice(0, 10),
    end: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    label: now.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}