import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatKopecks(kopecks: number | null | undefined): string {
  if (kopecks == null || Number.isNaN(kopecks)) return "0 ₽";
  const rubles = kopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles);
}

export function rublesToKopecks(value: string): number {
  const n = parseFloat(value.replace(",", ".").replace(/\s/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMMM yyyy, HH:mm", { locale: ru });
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "dd.MM.yyyy");
}

export function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}
