import { FileText } from "lucide-react";
import Link from "next/link";

interface PublicDocument {
  slug: string;
  title: string;
  excerpt: string | null;
  document_version: string | null;
  document_date: string | null;
  published_at: string | null;
  file_url: string | null;
}

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";

function getPublicApiBase(): string {
  return API_URL.replace(/\/admin$/, "");
}

async function fetchDocuments(): Promise<PublicDocument[]> {
  const base = getPublicApiBase();
  try {
    const res = await fetch(`${base}/documents`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? json ?? [];
  } catch {
    return [];
  }
}

export default async function PublicDocumentsPage() {
  const docs = await fetchDocuments();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Документы
      </h1>

      {docs.length === 0 ? (
        <p className="py-12 text-center text-text-muted">
          Нет доступных документов
        </p>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/d/${doc.slug}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-bg-secondary p-4 transition-colors hover:bg-bg-tertiary"
              >
                <FileText className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{doc.title}</p>
                  {doc.excerpt && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {doc.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                    {doc.document_version && <span>v{doc.document_version}</span>}
                    {doc.document_date && (
                      <span>
                        {new Date(doc.document_date).toLocaleDateString("ru-RU")}
                      </span>
                    )}
                    {doc.file_url && <span className="text-accent">PDF</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
