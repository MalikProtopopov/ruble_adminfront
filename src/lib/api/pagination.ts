export function buildListParams(
  base: Record<string, string | number | boolean | undefined | null>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      p.set(k, v ? "true" : "false");
      continue;
    }
    if (v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
