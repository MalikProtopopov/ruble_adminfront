"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type { Foundation, Paginated, PayoutBalanceRow, PayoutRecord } from "@/lib/api/types";
import { formatKopecks } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function PayoutsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [foundationId, setFoundationId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [note, setNote] = useState("");
  const [filterFoundation, setFilterFoundation] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");
  const [payoutDetail, setPayoutDetail] = useState<PayoutRecord | null>(null);

  const { data: foundations } = useQuery({
    queryKey: ["foundations", "short"],
    queryFn: async () => {
      const res = await adminClient.get<Paginated<Foundation>>(
        `/foundations${buildListParams({ limit: 100 })}`,
      );
      return res.data.data;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["payouts", "balance", pFrom, pTo],
    queryFn: async () => {
      const q = buildListParams({
        period_from: pFrom || undefined,
        period_to: pTo || undefined,
      });
      const res = await adminClient.get<{ data: PayoutBalanceRow[] }>(
        `/payouts/balance${q}`,
      );
      return res.data.data;
    },
  });

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["payouts", "list", filterFoundation, pFrom, pTo],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          foundation_id: filterFoundation || undefined,
          period_from: pFrom || undefined,
          period_to: pTo || undefined,
        });
        const res = await adminClient.get<Paginated<PayoutRecord>>(
          `/payouts${q}`,
        );
        return res.data;
      },
      getNextPageParam: (last) =>
        last.pagination.has_more ? last.pagination.next_cursor : undefined,
    });

  const rows = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const createMut = useMutation({
    mutationFn: async () => {
      await adminClient.post<PayoutRecord>("/payouts", {
        foundation_id: foundationId,
        amount_kopecks: Math.round(
          parseFloat(amount.replace(",", ".").replace(/\s/g, "")) * 100,
        ),
        period_from: periodFrom,
        period_to: periodTo,
        transfer_reference: transferRef || undefined,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Выплата записана");
      setModal(false);
      void qc.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns: ColumnDef<PayoutRecord>[] = useMemo(
    () => [
      { header: "Фонд", accessorKey: "foundation_name" },
      {
        header: "Сумма",
        cell: ({ row }) => formatKopecks(row.original.amount_kopecks),
      },
      {
        header: "Период",
        cell: ({ row }) =>
          `${row.original.period_from} — ${row.original.period_to}`,
      },
      { header: "Референс", accessorKey: "transfer_reference" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-sm"
            onClick={() => setPayoutDetail(row.original)}
          >
            Подробнее
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Выплаты" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <Label>Фонд</Label>
            <SelectField
              className="mt-1 min-w-[200px]"
              value={filterFoundation}
              onChange={(e) => setFilterFoundation(e.target.value)}
            >
              <option value="">Все</option>
              {foundations?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label>Период с</Label>
            <Input
              className="mt-1"
              type="date"
              value={pFrom}
              onChange={(e) => setPFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>Период по</Label>
            <Input
              className="mt-1"
              type="date"
              value={pTo}
              onChange={(e) => setPTo(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" onClick={() => setModal(true)}>
          Записать выплату
        </Button>
      </div>

      {balance && balance.length > 0 ? (
        <div className="mb-8 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary text-xs text-text-secondary">
              <tr>
                <th className="p-2">Фонд</th>
                <th className="p-2">Собрано НКО</th>
                <th className="p-2">Выплачено</th>
                <th className="p-2">К выплате</th>
              </tr>
            </thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.foundation_id} className="border-t border-border">
                  <td className="p-2">{b.foundation_name}</td>
                  <td className="p-2 font-mono">
                    {formatKopecks(b.collected_nco_kopecks)}
                  </td>
                  <td className="p-2 font-mono">
                    {formatKopecks(b.paid_kopecks)}
                  </td>
                  <td className="p-2 font-mono text-accent">
                    {formatKopecks(b.due_kopecks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : (
        <>
          <DataTable data={rows} columns={columns} />
          {hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                type="button"
                isLoading={isFetching}
                onClick={() => void fetchNextPage()}
              >
                Загрузить ещё
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={!!payoutDetail}
        onClose={() => setPayoutDetail(null)}
        title="Выплата"
      >
        {payoutDetail ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-text-secondary">ID</dt>
              <dd className="mt-0.5 font-mono text-xs">{payoutDetail.id}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Фонд</dt>
              <dd className="mt-0.5">{payoutDetail.foundation_name}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Сумма</dt>
              <dd className="mt-0.5 font-mono">
                {formatKopecks(payoutDetail.amount_kopecks)}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Период</dt>
              <dd className="mt-0.5">
                {payoutDetail.period_from} — {payoutDetail.period_to}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Референс</dt>
              <dd className="mt-0.5 font-mono">
                {payoutDetail.transfer_reference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Комментарий</dt>
              <dd className="mt-0.5">{payoutDetail.note ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Создано</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {payoutDetail.created_at}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Админ (ID)</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {payoutDetail.created_by_admin_id}
              </dd>
            </div>
          </dl>
        ) : null}
      </Dialog>

      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        title="Новая выплата"
      >
        <div className="space-y-3">
          <div>
            <Label>Фонд</Label>
            <SelectField
              className="mt-1"
              value={foundationId}
              onChange={(e) => setFoundationId(e.target.value)}
            >
              <option value="">Выберите</option>
              {foundations?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label>Сумма (₽)</Label>
            <Input
              className="mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Период с</Label>
            <Input
              className="mt-1"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>Период по</Label>
            <Input
              className="mt-1"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>
          <div>
            <Label>Референс перевода</Label>
            <Input
              className="mt-1"
              value={transferRef}
              onChange={(e) => setTransferRef(e.target.value)}
            />
          </div>
          <div>
            <Label>Комментарий</Label>
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={
              !foundationId ||
              !amount ||
              !periodFrom ||
              !periodTo ||
              Number.isNaN(
                parseFloat(amount.replace(",", ".").replace(/\s/g, "")),
              )
            }
            isLoading={createMut.isPending}
          >
            Сохранить
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
