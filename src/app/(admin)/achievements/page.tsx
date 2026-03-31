"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { Achievement } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropZone } from "@/components/media/image-drop-zone";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function AchievementsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Achievement | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const res = await adminClient.get<{ data: Achievement[] }>(
        "/achievements",
      );
      return res.data.data;
    },
  });

  const editId = searchParams.get("edit");
  useEffect(() => {
    if (!editId) {
      setEdit(null);
      return;
    }
    if (!data) return;
    const a = data.find((x) => x.id === editId);
    setEdit(a ?? null);
  }, [editId, data]);

  const columns: ColumnDef<Achievement>[] = useMemo(
    () => [
      {
        header: "Код",
        cell: ({ row }) => (
          <Link
            href={`/achievements?edit=${row.original.id}`}
            className="font-mono text-accent hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      { header: "Название", accessorKey: "title" },
      {
        header: "Активно",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "muted"}>
            {row.original.is_active ? "да" : "нет"}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Достижения" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />
      <div className="mb-4">
        <Button type="button" onClick={() => setModal(true)}>
          + Создать достижение
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : (
        <DataTable data={data ?? []} columns={columns} />
      )}
      <AchievementFormDialog
        open={modal}
        onClose={() => setModal(false)}
        onDone={() => {
          setModal(false);
          void qc.invalidateQueries({ queryKey: ["achievements"] });
        }}
      />
      <AchievementFormDialog
        open={!!edit}
        initial={edit ?? undefined}
        onClose={() => {
          setEdit(null);
          if (searchParams.get("edit")) router.replace("/achievements");
        }}
        onDone={() => {
          setEdit(null);
          if (searchParams.get("edit")) router.replace("/achievements");
          void qc.invalidateQueries({ queryKey: ["achievements"] });
        }}
      />
    </div>
  );
}

function AchievementFormDialog({
  open,
  onClose,
  onDone,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  initial?: Achievement;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [conditionType, setConditionType] = useState("donations_count");
  const [conditionValue, setConditionValue] = useState("1");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCode(initial.code);
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setIconUrl(initial.icon_url ?? "");
      setConditionType(initial.condition_type);
      setConditionValue(String(initial.condition_value));
    } else {
      setCode("");
      setTitle("");
      setDescription("");
      setIconUrl("");
      setConditionType("donations_count");
      setConditionValue("1");
    }
  }, [initial, open]);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) {
        await adminClient.patch(`/achievements/${initial.id}`, {
          title,
          description: description || undefined,
          icon_url: iconUrl || undefined,
          condition_type: conditionType,
          condition_value: Number(conditionValue),
        });
      } else {
        await adminClient.post("/achievements", {
          code,
          title,
          description: description || undefined,
          icon_url: iconUrl || undefined,
          condition_type: conditionType,
          condition_value: Number(conditionValue),
        });
      }
    },
    onSuccess: () => {
      toast.success(initial ? "Обновлено" : "Создано");
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать достижение" : "Новое достижение"}
    >
      <div className="space-y-3">
        <div>
          <Label>Код</Label>
          <Input
            className="mt-1 font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!initial}
          />
        </div>
        <div>
          <Label>Название</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Описание</Label>
          <Textarea
            className="mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>Иконка</Label>
          <div className="mt-1">
            <ImageDropZone
              value={iconUrl}
              onChange={setIconUrl}
              label="Иконка достижения"
            />
          </div>
        </div>
        <div>
          <Label>Тип условия</Label>
          <SelectField
            className="mt-1"
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
          >
            <option value="streak_days">streak_days</option>
            <option value="total_amount_kopecks">total_amount_kopecks</option>
            <option value="donations_count">donations_count</option>
          </SelectField>
        </div>
        <div>
          <Label>Значение порога</Label>
          <Input
            className="mt-1"
            type="number"
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={() => mut.mutate()}
          disabled={!code || !title}
          isLoading={mut.isPending}
        >
          {initial ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </Dialog>
  );
}
