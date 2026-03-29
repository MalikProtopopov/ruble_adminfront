"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    if (useAuthStore.getState().accessToken) {
      router.replace("/");
    }
  }, [router]);
  const [showPw, setShowPw] = useState(false);
  const [shake, setShake] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setBanner(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as {
        access_token?: string;
        admin?: { id: string; email: string; name: string };
        error?: { code?: string; message?: string };
      };
      if (!res.ok) {
        const code = data.error?.code;
        if (code === "ACCOUNT_DISABLED" || code?.includes("DISABLED")) {
          setBanner(
            "Аккаунт деактивирован. Обратитесь к другому администратору.",
          );
        } else {
          setFormError("root", {
            message: "Неверный email или пароль",
          });
          setShake(true);
          setTimeout(() => setShake(false), 320);
        }
        return;
      }
      if (data.access_token && data.admin) {
        useAuthStore.getState().setSession(data.access_token, data.admin);
        router.replace("/");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-bg-secondary p-8 shadow-xl">
      <div className="mb-8 text-center">
        <p className="font-mono text-lg font-semibold text-accent">По Рублю</p>
        <p className="text-sm text-text-secondary">Административная панель</p>
      </div>
      {banner ? (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger-muted px-3 py-2 text-sm text-danger">
          {banner}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={shake ? "animate-shake" : undefined}
      >
        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={submitting}
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <div className="mb-6">
          <Label htmlFor="password">Пароль</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              disabled={submitting}
              className="pr-10"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {errors.root?.message ? (
          <p className="mb-4 text-sm text-danger">{errors.root.message}</p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          isLoading={submitting}
          disabled={submitting}
        >
          Войти
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-text-muted">
        <Link href="/" className="hover:text-accent">
          На главную
        </Link>
      </p>
    </div>
  );
}
