"use client";

import { adminClient } from "@/lib/api/admin-client";
import type { StatsOverview } from "@/lib/api/types";
import { buildListParams } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatKopecks } from "@/lib/utils/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { SelectField } from "@/components/ui/select-field";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

function endOfDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startPreset(preset: string): { from: string; to: string } | null {
  const to = new Date();
  const toStr = endOfDay(to);
  if (preset === "all") return null;
  if (preset === "today") {
    return { from: toStr, to: toStr };
  }
  if (preset === "month") {
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from: endOfDay(from), to: toStr };
  }
  if (preset === "prev_month") {
    const first = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 0);
    return { from: endOfDay(first), to: endOfDay(last) };
  }
  const from = new Date(to);
  if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else return null;
  return { from: endOfDay(from), to: toStr };
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return startPreset(preset);
  }, [preset, customFrom, customTo]);

  const qs = useMemo(() => {
    if (!range) return "";
    return buildListParams({
      period_from: range.from,
      period_to: range.to,
    });
  }, [range]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["stats", "overview", qs],
    queryFn: async () => {
      const res = await adminClient.get<StatsOverview>(
        `/stats/overview${qs}`,
      );
      return res.data;
    },
  });

  const feePct =
    data && data.gmv_kopecks > 0
      ? Math.round((data.platform_fee_kopecks / data.gmv_kopecks) * 100)
      : 0;

  const retentionData = data
    ? [
        { name: "30д", value: Math.round(data.retention_30d * 100) },
        { name: "90д", value: Math.round(data.retention_90d * 100) },
      ]
    : [];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Дашборд" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <Label>Период</Label>
          <SelectField
            className="mt-1 min-w-[200px]"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            <option value="all">За всё время</option>
            <option value="today">Сегодня</option>
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="month">Этот месяц</option>
            <option value="prev_month">Прошлый месяц</option>
            <option value="custom">Произвольный</option>
          </SelectField>
        </div>
        {preset === "custom" ? (
          <div className="flex gap-2">
            <div>
              <Label>С</Label>
              <input
                type="date"
                className="mt-1 rounded-md border border-border bg-bg-tertiary px-2 py-2 text-sm"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>По</Label>
              <input
                type="date"
                className="mt-1 rounded-md border border-border bg-bg-tertiary px-2 py-2 text-sm"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        ) : null}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            void qc.invalidateQueries({ queryKey: ["stats", "overview"] })
          }
        >
          Применить
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="GMV"
          value={data ? formatKopecks(data.gmv_kopecks) : "—"}
        />
        <StatCard
          label="Комиссия платформы"
          value={data ? formatKopecks(data.platform_fee_kopecks) : "—"}
          hint={data ? `${feePct}% от GMV` : undefined}
        />
        <StatCard
          label="Доноры"
          value={data?.total_donors ?? "—"}
          hint={
            data ? `+${data.new_donors_period} за период` : undefined
          }
        />
        <StatCard
          label="Подписки"
          value={data?.active_subscriptions ?? "—"}
          hint="активных"
        />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-secondary p-4">
          <p className="mb-4 text-sm font-medium text-text-secondary">
            Retention
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionData}>
                <XAxis dataKey="name" stroke="#8a8a8a" fontSize={12} />
                <YAxis stroke="#8a8a8a" fontSize={12} domain={[0, 100]} />
                <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data ? (
            <p className="mt-2 text-xs text-text-muted">
              30 дней: {Math.round(data.retention_30d * 100)}% · 90 дней:{" "}
              {Math.round(data.retention_90d * 100)}%
            </p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-bg-secondary p-4">
          <p className="mb-4 text-sm font-medium text-text-secondary">
            Быстрые действия
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/foundations"
              className={cn(
                "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm transition-all duration-150",
                buttonVariants.secondary,
              )}
            >
              + Добавить фонд
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm transition-all duration-150",
                buttonVariants.secondary,
              )}
            >
              + Создать кампанию
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm transition-all duration-150",
                buttonVariants.secondary,
              )}
            >
              Записать офлайн-платёж
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
