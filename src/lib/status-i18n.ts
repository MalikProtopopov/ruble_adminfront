import type { CampaignStatus, FoundationStatus } from "@/lib/api/types";

export function foundationStatusLabel(s: FoundationStatus): string {
  const m: Record<FoundationStatus, string> = {
    active: "Активен",
    pending_verification: "На проверке",
    suspended: "Заморожен",
  };
  return m[s] ?? s;
}

export function campaignStatusLabel(s: CampaignStatus): string {
  const m: Record<CampaignStatus, string> = {
    draft: "Черновик",
    active: "Активна",
    paused: "Пауза",
    completed: "Завершена",
    archived: "Архив",
  };
  return m[s] ?? s;
}
