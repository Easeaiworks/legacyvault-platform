'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Field } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useList, useRemove } from '@/lib/hooks';
import { DOCUMENT_CATEGORY_LABELS } from '@/lib/asset-types';

interface Doc {
  id: string;
  title: string;
  category: string;
  sizeBytes: string;
  mimeType: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: docs = [], isLoading, refetch } = useList<Doc>('documents', '/documents');
  const remove = useRemove('documents', '/documents');
  const [uploading, setUploading] = useState(false);

  const grouped = useMemo(() => {
    const g = new Map<string, Doc[]>();
    for (const d of docs) {
      const list = g.get(d.category) ?? [];
      list.push(d);
      g.set(d.category, list);
    }
    return g;
  }, [docs]);

  async function download(id: string) {
    const { url } = await apiClient.get<{ url: string }>(`/documents/${id}/download-url`);
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Documents</h1>
          <p className="mt-1 text-ink-500">
            {docs.length} on file. Wills, trusts, deeds, statements — all encrypted.
          </p>
        </div>
        <Button onClick={() => setUploading(true)}>Upload document</Button>
      </div>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && docs.length === 0 && (
        <EmptyState
          title="No documents yet"
          body="Your will is the most important one. Scan or photograph it and upload here."
          action={<Button onClick={() => setUploading(true)}>Upload your will</Button>}
        />
      )}

      {Array.from(grouped.entries()).map(([cat, items]) => (
        <Card key={cat} className="mb-6">
          <CardHeader>
            <CardTitle>{DOCUMENT_CATEGORY_LABELS[cat] ?? cat}</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {items.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-900">{d.title}</div>
                  <div className="text-sm text-ink-500">
                    {d.mimeType} · {(Number(d.sizeBytes) / 1024).toFixed(0)} KB ·{' '}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => download(d.id)}>
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${d.title}"?`)) remove.mutate(d.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {uploading && (
        <UploadDialog
          onClose={() => {
            setUploading(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ----- Upload dialog: presign → PUT → confirm -----

function UploadDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('WILL');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function sha256Hex(f: File): Promise<string> {
    const buf = await f.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function upload() {
    if (!file) return;
    setError(null);
    try {
      setProgress('Hashing…');
      const hash = await sha256Hex(file);

      setProgress('Requesting upload URL…');
      const init = await apiClient.post<{ documentId: string; uploadUrl: string }>(
        '/documents/upload-init',
        {
          category,
          title: title || file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          contentSha256: hash,
        },
      );

      setProgress('Uploading to secure storage…');
      const put = await fetch(init.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      setProgress('Finalizing…');
      await apiClient.post(`/documents/${init.documentId}/upload-confirm`, {});

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl text-navy-900">Upload document</h2>

        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Will — 2024"
          />
        </Field>

        <Field label="File" hint="PDF, images, or Word docs up to 500 MB.">
          <input
            ref={fileRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        {progress && <p className="mb-2 text-sm text-navy-700">{progress}</p>}
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={!!progress && !error}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={!file || (!!progress && !error)}>
            {progress && !error ? 'Working…' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}
