import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PublicDocumentDetail {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";

function getPublicApiBase(): string {
  return API_URL.replace(/\/admin$/, "");
}

async function fetchDocument(
  slug: string,
): Promise<PublicDocumentDetail | null> {
  const base = getPublicApiBase();
  try {
    const res = await fetch(`${base}/documents/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await fetchDocument(slug);
  if (!doc) return { title: "Документ не найден" };
  return {
    title: `${doc.title} — По Рублю`,
    description: doc.content?.slice(0, 160) ?? doc.title,
  };
}

export default async function PublicDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await fetchDocument(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/d"
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Все документы
      </Link>

      <article>
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">
          {doc.title}
        </h1>
        <p className="mb-6 text-xs text-text-muted">
          Обновлён: {new Date(doc.updated_at).toLocaleDateString("ru-RU")}
        </p>

        {doc.file_url ? (
          <a
            href={doc.file_url}
            target="_blank"
            rel="noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm text-accent transition-colors hover:bg-bg-tertiary"
          >
            <Download className="size-4" />
            Скачать документ
          </a>
        ) : null}

        {doc.content ? (
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {doc.content}
          </div>
        ) : !doc.file_url ? (
          <p className="text-text-muted">Содержание отсутствует</p>
        ) : null}
      </article>
    </div>
  );
}
