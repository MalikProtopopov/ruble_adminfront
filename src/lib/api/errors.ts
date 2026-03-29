import type { AxiosError } from "axios";

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
  detail?: Array<{ loc: string[]; msg: string; type: string }>;
}

export function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<ApiErrorBody>;
  const data = ax.response?.data;
  if (data?.error?.message) return data.error.message;
  if (data?.error?.code) return String(data.error.code);
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
    return data.detail.map((d) => d.msg).join(", ");
  }
  if (ax.message) return ax.message;
  return "Неизвестная ошибка";
}

export function getErrorCode(err: unknown): string | undefined {
  const ax = err as AxiosError<ApiErrorBody>;
  return ax.response?.data?.error?.code;
}
